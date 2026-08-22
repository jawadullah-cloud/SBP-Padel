from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient, identifier: str, password: str) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": identifier, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_admin_rbac_and_pricing_rule_creation() -> None:
    with TestClient(app) as client:
        player_headers = login(client, "player@sbppadel.local", "PadelDemo2026!")
        denied = client.get("/api/v1/admin/venues", headers=player_headers)
        assert denied.status_code == 403

        admin_headers = login(client, "admin@sbppadel.local", "PadelAdmin2026!")
        venues = client.get("/api/v1/admin/venues", headers=admin_headers)
        assert venues.status_code == 200
        venue_id = venues.json()[0]["id"]

        courts = client.get(
            f"/api/v1/admin/venues/{venue_id}/courts", headers=admin_headers
        )
        assert courts.status_code == 200
        court_id = courts.json()[0]["id"]

        created = client.post(
            "/api/v1/admin/pricing-rules",
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "weekdays": [5, 6],
                "start_time": "08:00",
                "end_time": "10:00",
                "hourly_rate": "2500.00",
                "currency": "PKR",
                "priority": 500,
            },
            headers=admin_headers,
        )
        assert created.status_code == 200

        rules = client.get(
            "/api/v1/admin/pricing-rules",
            params={"venue_id": venue_id},
            headers=admin_headers,
        )
        assert rules.status_code == 200
        assert any(rule["id"] == created.json()["id"] for rule in rules.json())

        deactivated = client.delete(
            f"/api/v1/admin/pricing-rules/{created.json()['id']}",
            headers=admin_headers,
        )
        assert deactivated.status_code == 200
        assert deactivated.json()["is_active"] is False
