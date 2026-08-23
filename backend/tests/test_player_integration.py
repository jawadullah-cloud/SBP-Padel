from fastapi.testclient import TestClient

from app.main import app


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_player_can_lookup_payment_by_own_booking() -> None:
    with TestClient(app) as client:
        headers = player_headers(client)
        policy = client.get("/api/v1/policies/active").json()
        venue = client.get("/api/v1/venues").json()[0]
        detail = client.get(f"/api/v1/venues/{venue['id']}").json()
        court_id = detail["courts"][4]["id"]
        created = client.post(
            "/api/v1/bookings",
            headers=headers,
            json={
                "venue_id": venue["id"],
                "court_id": court_id,
                "booking_date": "2026-11-15",
                "slots": [{"start_time": "14:00"}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
        )
        assert created.status_code == 200
        initiated = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": created.json()["id"], "method": "wallet"},
        )
        assert initiated.status_code == 200
        lookup = client.get(
            f"/api/v1/payments/by-booking/{created.json()['id']}", headers=headers
        )
        assert lookup.status_code == 200
        assert lookup.json()["id"] == initiated.json()["payment_id"]
        assert lookup.json()["booking_id"] == created.json()["id"]
