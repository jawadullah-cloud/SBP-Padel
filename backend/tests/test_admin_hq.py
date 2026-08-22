from fastapi.testclient import TestClient

from app.main import app


def admin_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@sbppadel.local", "password": "PadelAdmin2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_hq_dashboard_and_venue_creation() -> None:
    with TestClient(app) as client:
        headers = admin_headers(client)
        dashboard = client.get("/api/v1/admin/dashboard", headers=headers)
        assert dashboard.status_code == 200
        assert dashboard.json()["venues"] >= 1

        created = client.post(
            "/api/v1/admin/venues",
            headers=headers,
            json={
                "name": "Test Punjab Padel Centre",
                "city": "Rawalpindi",
                "address": "Test Sports Complex, Rawalpindi",
                "latitude": 33.5651,
                "longitude": 73.0169,
                "amenities": ["Parking", "Floodlights"],
                "opening_time": "07:00",
                "closing_time": "22:00",
            },
        )
        assert created.status_code == 200
        venue_id = created.json()["id"]

        court = client.post(
            f"/api/v1/admin/venues/{venue_id}/courts",
            headers=headers,
            json={
                "code": "01",
                "name": "Court 01",
                "court_type": "Training Court",
                "capacity": 4,
                "is_indoor": False,
            },
        )
        assert court.status_code == 200
        assert court.json()["status"] == "active"


def test_staff_assignment_and_policy_publish() -> None:
    with TestClient(app) as client:
        headers = admin_headers(client)
        venues = client.get("/api/v1/admin/venues", headers=headers).json()
        venue_id = venues[0]["id"]

        staff = client.post(
            "/api/v1/admin/staff",
            headers=headers,
            json={
                "full_name": "Test Venue Manager",
                "email": "test.manager.hq@sbppadel.local",
                "password": "Temporary2026!",
                "role": "venue_manager",
            },
        )
        if staff.status_code == 409:
            existing = client.get("/api/v1/admin/staff", headers=headers).json()
            user_id = next(x["id"] for x in existing if x["email"] == "test.manager.hq@sbppadel.local")
        else:
            assert staff.status_code == 200
            user_id = staff.json()["id"]

        assignment = client.post(
            "/api/v1/admin/staff-assignments",
            headers=headers,
            json={"user_id": user_id, "venue_id": venue_id, "role": "manager"},
        )
        assert assignment.status_code == 200
        assert assignment.json()["is_active"] is True

        version = "test-policy-hq-1"
        published = client.post(
            "/api/v1/admin/policies/publish",
            headers=headers,
            json={
                "version": version,
                "title": "Test Booking Policy",
                "body": "This test policy exists only to validate central administration policy publishing behavior.",
            },
        )
        assert published.status_code in {200, 409}

        policies = client.get("/api/v1/admin/policies", headers=headers)
        assert policies.status_code == 200
        assert any(p["version"] == version for p in policies.json())


def test_player_cannot_access_hq_admin() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        response = client.get("/api/v1/admin/dashboard", headers=headers)
        assert response.status_code == 403
