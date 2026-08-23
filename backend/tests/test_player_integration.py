from fastapi.testclient import TestClient

from app.main import app


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def create_player_booking(client: TestClient, headers: dict[str, str], date: str, start_time: str):
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
            "booking_date": date,
            "slots": [{"start_time": start_time}],
            "policy_version_id": policy["id"],
            "policy_accepted": True,
        },
    )
    assert created.status_code == 200
    return created.json()


def test_player_can_lookup_payment_by_own_booking() -> None:
    with TestClient(app) as client:
        headers = player_headers(client)
        created = create_player_booking(client, headers, "2026-11-15", "14:00")
        initiated = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": created["id"], "method": "wallet"},
        )
        assert initiated.status_code == 200
        lookup = client.get(
            f"/api/v1/payments/by-booking/{created['id']}", headers=headers
        )
        assert lookup.status_code == 200
        assert lookup.json()["id"] == initiated.json()["payment_id"]
        assert lookup.json()["booking_id"] == created["id"]

        history = client.get("/api/v1/payments/me", headers=headers)
        assert history.status_code == 200
        entry = next(row for row in history.json() if row["id"] == initiated.json()["payment_id"])
        assert entry["booking_id"] == created["id"]
        assert entry["booking_code"] == created["booking_code"]
        assert entry["method"] == "wallet"
        assert entry["refund"] is None


def test_successful_new_booking_creates_actual_player_notification() -> None:
    with TestClient(app) as client:
        headers = player_headers(client)
        created = create_player_booking(client, headers, "2026-11-16", "15:00")
        initiated = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": created["id"], "method": "wallet"},
        )
        assert initiated.status_code == 200

        confirmed = client.post(
            f"/api/v1/payments/{initiated.json()['payment_id']}/simulate-success",
            headers=headers,
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["booking_status"] == "confirmed"
        assert confirmed.json()["booking_code"] == created["booking_code"]

        notifications = client.get("/api/v1/notifications/me", headers=headers)
        assert notifications.status_code == 200
        matches = [
            row for row in notifications.json()
            if row["kind"] == "booking_confirmed"
            and created["booking_code"] in row["body"]
            and row["payload"].get("booking_id") == created["id"]
        ]
        assert len(matches) == 1
        assert matches[0]["title"] == "Booking confirmed"
        assert matches[0]["read"] is False
