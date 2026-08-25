from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

import app.api.operations_passes as operations_passes
from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_rescheduled_paid_booking_remains_valid_for_pass_and_check_in(monkeypatch) -> None:
    with TestClient(app) as client:
        player = auth(client, "player@sbppadel.local", "PadelDemo2026!")
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")

        venue_id = client.get("/api/v1/operations/my-venues", headers=operator).json()[0]["id"]
        venue = client.get(f"/api/v1/venues/{venue_id}").json()
        court = next(row for row in venue["courts"] if row["code"] == "03")
        policy = client.get("/api/v1/policies/active").json()

        original_date = "2026-12-20"
        rescheduled_date = "2026-12-21"
        created = client.post(
            "/api/v1/bookings",
            headers=player,
            json={
                "venue_id": venue_id,
                "court_id": court["id"],
                "booking_date": original_date,
                "slots": [{"start_time": "14:00"}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()

        payment = client.post(
            "/api/v1/payments/initiate",
            headers=player,
            json={"booking_id": booking["id"], "method": "card"},
        )
        assert payment.status_code == 200, payment.text
        assert client.post(
            f"/api/v1/payments/{payment.json()['payment_id']}/simulate-success", headers=player
        ).status_code == 200

        moved = client.post(
            f"/api/v1/bookings/{booking['id']}/reschedule",
            headers=player,
            json={"booking_date": rescheduled_date, "slots": [{"start_time": "14:00"}]},
        )
        assert moved.status_code == 200, moved.text
        assert moved.json()["status"] == "rescheduled"

        monkeypatch.setattr(
            operations_passes,
            "venue_now",
            lambda venue: datetime(2026, 12, 21, 13, 30, tzinfo=ZoneInfo("Asia/Karachi")),
        )
        validated = client.post(
            "/api/v1/operations/pass/validate",
            headers=operator,
            json={"venue_id": venue_id, "pass_value": booking["booking_code"]},
        )
        assert validated.status_code == 200, validated.text
        pass_data = validated.json()
        assert pass_data["valid"] is True
        assert pass_data["can_check_in"] is True
        assert pass_data["reason_code"] == "valid"
        assert pass_data["booking"]["status"] == "rescheduled"
        assert pass_data["booking"]["date"] == rescheduled_date

        checked = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/check-in",
            headers=operator,
            json={},
        )
        assert checked.status_code == 200, checked.text
        assert checked.json()["checked_in"] is True

        feed = client.get(
            "/api/v1/operations/bookings",
            headers=operator,
            params={"venue_id": venue_id, "q": booking["booking_code"]},
        )
        assert feed.status_code == 200, feed.text
        row = next(item for item in feed.json() if item["id"] == booking["id"])
        assert row["status"] == "rescheduled"
        assert row["checked_in"] is True
