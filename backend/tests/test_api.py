from fastapi.testclient import TestClient

from app.main import app


def login_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_seeded_venue_and_variable_pricing() -> None:
    with TestClient(app) as client:
        venues = client.get("/api/v1/venues")
        assert venues.status_code == 200
        venue = next(v for v in venues.json() if v["name"] == "Nishtar Park Sports Complex")
        availability = client.get(
            f"/api/v1/venues/{venue['id']}/availability",
            params={"date": "2026-08-23"},
        )
        assert availability.status_code == 200
        courts = availability.json()["courts"]
        assert len(courts) == 5
        championship = next(c for c in courts if c["court_code"] == "01")
        rates = {
            slot["start_time"]: slot["hourly_rate"]
            for slot in championship["slots"]
            if slot["hourly_rate"] is not None
        }
        assert rates["17:00"] == "2000.00"
        assert rates["19:00"] == "2200.00"
        assert rates["21:00"] == "2000.00"


def test_policy_login_quote_booking_and_cancel() -> None:
    with TestClient(app) as client:
        headers = login_headers(client)
        me = client.get("/api/v1/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["role"] == "player"

        policy = client.get("/api/v1/policies/active")
        assert policy.status_code == 200
        venues = client.get("/api/v1/venues").json()
        venue_id = venues[0]["id"]
        detail = client.get(f"/api/v1/venues/{venue_id}").json()
        court_id = next(c["id"] for c in detail["courts"] if c["code"] == "01")
        payload = {
            "venue_id": venue_id,
            "court_id": court_id,
            "booking_date": "2026-09-01",
            "slots": [{"start_time": "19:00"}, {"start_time": "20:00"}],
        }

        quote = client.post("/api/v1/bookings/quote", json=payload)
        assert quote.status_code == 200
        assert quote.json()["court_fee"] == "4400.00"
        assert quote.json()["total"] == "4500.00"

        created = client.post(
            "/api/v1/bookings",
            json={
                **payload,
                "policy_version_id": policy.json()["id"],
                "policy_accepted": True,
            },
            headers=headers,
        )
        assert created.status_code == 200
        assert created.json()["status"] == "pending_payment"
        assert created.json()["hold_minutes"] == 10

        conflict = client.post("/api/v1/bookings/quote", json=payload)
        assert conflict.status_code == 409

        cancelled = client.post(
            f"/api/v1/bookings/{created.json()['id']}/cancel",
            json={"reason": "Changed plans"},
            headers=headers,
        )
        assert cancelled.status_code == 200
        assert cancelled.json()["status"] == "cancelled"
        assert cancelled.json()["slots_released"] is True
        assert client.post("/api/v1/bookings/quote", json=payload).status_code == 200


def test_payment_confirmation_notification_and_refund_request() -> None:
    with TestClient(app) as client:
        headers = login_headers(client)
        policy = client.get("/api/v1/policies/active").json()
        venue = client.get("/api/v1/venues").json()[0]
        detail = client.get(f"/api/v1/venues/{venue['id']}").json()
        court_id = next(c["id"] for c in detail["courts"] if c["code"] == "02")
        booking_payload = {
            "venue_id": venue["id"],
            "court_id": court_id,
            "booking_date": "2026-09-02",
            "slots": [{"start_time": "18:00"}],
            "policy_version_id": policy["id"],
            "policy_accepted": True,
        }
        created = client.post("/api/v1/bookings", json=booking_payload, headers=headers)
        assert created.status_code == 200

        initiated = client.post(
            "/api/v1/payments/initiate",
            json={"booking_id": created.json()["id"], "method": "wallet"},
            headers=headers,
        )
        assert initiated.status_code == 200
        payment_id = initiated.json()["payment_id"]
        assert initiated.json()["status"] == "pending"
        assert initiated.json()["requires_provider_integration"] is True

        confirmed = client.post(
            f"/api/v1/payments/{payment_id}/simulate-success",
            headers=headers,
        )
        assert confirmed.status_code == 200
        assert confirmed.json()["payment_status"] == "paid"
        assert confirmed.json()["booking_status"] == "confirmed"

        booking = client.get(
            f"/api/v1/bookings/{created.json()['id']}", headers=headers
        )
        assert booking.status_code == 200
        assert booking.json()["status"] == "confirmed"

        notifications = client.get("/api/v1/notifications/me", headers=headers)
        assert notifications.status_code == 200
        assert any(n["kind"] == "booking_confirmed" for n in notifications.json())

        cancelled = client.post(
            f"/api/v1/bookings/{created.json()['id']}/cancel",
            json={"reason": "Unable to attend"},
            headers=headers,
        )
        assert cancelled.status_code == 200
        assert cancelled.json()["refund_required"] is True

        refund = client.post(
            f"/api/v1/payments/{payment_id}/refund",
            json={"reason": "Booking cancelled by player"},
            headers=headers,
        )
        assert refund.status_code == 200
        assert refund.json()["status"] == "requested"

        notifications_after = client.get("/api/v1/notifications/me", headers=headers)
        assert any(n["kind"] == "refund_requested" for n in notifications_after.json())
