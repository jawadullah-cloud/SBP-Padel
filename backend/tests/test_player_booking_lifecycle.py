from fastapi.testclient import TestClient

from app.main import app


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_confirm_reschedule_cancel_refund_lifecycle() -> None:
    with TestClient(app) as client:
        headers = player_headers(client)
        venue = client.get("/api/v1/venues").json()[0]
        venue_detail = client.get(f"/api/v1/venues/{venue['id']}").json()
        court = venue_detail["courts"][3]
        policy = client.get("/api/v1/policies/active").json()
        original_date = "2026-12-10"
        new_date = "2026-12-11"
        start_time = "14:00"

        created = client.post(
            "/api/v1/bookings",
            headers=headers,
            json={
                "venue_id": venue["id"],
                "court_id": court["id"],
                "booking_date": original_date,
                "slots": [{"start_time": start_time}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()

        initiated = client.post(
            "/api/v1/payments/initiate",
            headers=headers,
            json={"booking_id": booking["id"], "method": "wallet"},
        )
        assert initiated.status_code == 200, initiated.text
        payment_id = initiated.json()["payment_id"]
        confirmed = client.post(
            f"/api/v1/payments/{payment_id}/simulate-success", headers=headers
        )
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["booking_status"] == "confirmed"

        moved = client.post(
            f"/api/v1/bookings/{booking['id']}/reschedule",
            headers=headers,
            json={"booking_date": new_date, "slots": [{"start_time": start_time}]},
        )
        assert moved.status_code == 200, moved.text
        assert moved.json()["status"] == "rescheduled"
        assert moved.json()["date"] == new_date

        detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["status"] == "rescheduled"
        assert detail.json()["date"] == new_date
        assert detail.json()["slots"][0]["start_time"] == start_time

        old_availability = client.get(
            f"/api/v1/venues/{venue['id']}/availability?date={original_date}"
        ).json()
        old_court = next(row for row in old_availability["courts"] if row["court_id"] == court["id"])
        old_slot = next(row for row in old_court["slots"] if row["start_time"] == start_time)
        assert old_slot["available"] is True

        new_availability = client.get(
            f"/api/v1/venues/{venue['id']}/availability?date={new_date}"
        ).json()
        new_court = next(row for row in new_availability["courts"] if row["court_id"] == court["id"])
        new_slot = next(row for row in new_court["slots"] if row["start_time"] == start_time)
        assert new_slot["available"] is False

        notifications = client.get("/api/v1/notifications/me", headers=headers).json()
        assert any(
            row["kind"] == "booking_rescheduled"
            and row["payload"].get("booking_id") == booking["id"]
            and row["payload"].get("new_date") == new_date
            for row in notifications
        )

        cancelled = client.post(
            f"/api/v1/bookings/{booking['id']}/cancel",
            headers=headers,
            json={"reason": "Player lifecycle QA"},
        )
        assert cancelled.status_code == 200, cancelled.text
        assert cancelled.json()["status"] == "cancelled"
        assert cancelled.json()["refund_required"] is True

        refunded = client.post(
            f"/api/v1/payments/{payment_id}/refund",
            headers=headers,
            json={"reason": "Player lifecycle QA"},
        )
        assert refunded.status_code == 200, refunded.text
        assert refunded.json()["status"] == "requested"

        history = client.get("/api/v1/payments/me", headers=headers)
        assert history.status_code == 200
        payment = next(row for row in history.json() if row["id"] == payment_id)
        assert payment["refund"] is not None
        assert payment["refund"]["status"] == "requested"

        final_notifications = client.get("/api/v1/notifications/me", headers=headers).json()
        kinds = {
            row["kind"]
            for row in final_notifications
            if row["payload"].get("booking_id") == booking["id"]
        }
        assert {"booking_confirmed", "booking_rescheduled", "booking_cancelled", "refund_requested"}.issubset(kinds)
