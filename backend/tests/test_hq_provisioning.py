from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_hq_can_provision_venue_from_empty_to_bookable() -> None:
    with TestClient(app) as client:
        admin = auth(client, "admin@sbppadel.local", "PadelAdmin2026!")

        venue_response = client.post(
            "/api/v1/admin/venues",
            headers=admin,
            json={
                "name": "HQ Provisioning QA Venue",
                "city": "Lahore",
                "address": "QA Sports Complex, Lahore",
                "latitude": 31.5204,
                "longitude": 74.3587,
                "opening_time": "06:00",
                "closing_time": "23:00",
                "amenities": [],
            },
        )
        assert venue_response.status_code == 200, venue_response.text
        venue_id = venue_response.json()["id"]

        court_response = client.post(
            f"/api/v1/admin/venues/{venue_id}/courts",
            headers=admin,
            json={
                "code": "01",
                "name": "QA Court 1",
                "court_type": "Standard",
                "capacity": 4,
                "is_indoor": False,
            },
        )
        assert court_response.status_code == 200, court_response.text
        court_id = court_response.json()["id"]

        # A court alone is not bookable. Bookable-hours/pricing rules define the schedule.
        before = client.get(
            f"/api/v1/venues/{venue_id}/availability",
            params={"date": "2026-10-20"},
        )
        assert before.status_code == 200, before.text
        qa_court = next(row for row in before.json()["courts"] if row["court_id"] == court_id)
        assert qa_court["slots"] == []

        rule_response = client.post(
            "/api/v1/admin/pricing-rules",
            headers=admin,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "valid_from": "2026-10-01",
                "valid_to": "2026-10-31",
                "weekdays": [0, 1, 2, 3, 4, 5, 6],
                "start_time": "18:00",
                "end_time": "20:00",
                "hourly_rate": 2200,
                "currency": "PKR",
                "priority": 200,
            },
        )
        assert rule_response.status_code == 200, rule_response.text

        after = client.get(
            f"/api/v1/venues/{venue_id}/availability",
            params={"date": "2026-10-20"},
        )
        assert after.status_code == 200, after.text
        qa_court = next(row for row in after.json()["courts"] if row["court_id"] == court_id)
        assert [slot["start_time"] for slot in qa_court["slots"]] == ["18:00", "19:00"]
        assert all(slot["available"] for slot in qa_court["slots"])
        assert all(slot["hourly_rate"] == "2200.00" for slot in qa_court["slots"])

        staff_response = client.post(
            "/api/v1/admin/staff",
            headers=admin,
            json={
                "full_name": "HQ Provisioning QA Manager",
                "email": "hq-provisioning-manager@sbppadel.local",
                "password": "PadelManagerQA2026!",
                "role": "venue_manager",
            },
        )
        assert staff_response.status_code in (200, 409), staff_response.text
        if staff_response.status_code == 200:
            staff_id = staff_response.json()["id"]
        else:
            staff = client.get("/api/v1/admin/staff", headers=admin)
            assert staff.status_code == 200
            staff_id = next(row["id"] for row in staff.json() if row["email"] == "hq-provisioning-manager@sbppadel.local")

        assignment = client.post(
            "/api/v1/admin/staff-assignments",
            headers=admin,
            json={"user_id": staff_id, "venue_id": venue_id, "role": "manager"},
        )
        assert assignment.status_code == 200, assignment.text

        assignments = client.get(
            "/api/v1/admin/staff-assignments",
            headers=admin,
            params={"venue_id": venue_id},
        )
        assert assignments.status_code == 200, assignments.text
        assert any(row["user_id"] == staff_id and row["role"] == "manager" for row in assignments.json())
