from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_seeded_venue_and_variable_pricing() -> None:
    with TestClient(app) as client:
        venues = client.get("/api/v1/venues")
        assert venues.status_code == 200
        data = venues.json()
        venue = next(v for v in data if v["name"] == "Nishtar Park Sports Complex")
        availability = client.get(
            f"/api/v1/venues/{venue['id']}/availability",
            params={"date": "2026-08-23"},
        )
        assert availability.status_code == 200
        courts = availability.json()["courts"]
        assert len(courts) == 5
        championship = next(c for c in courts if c["court_code"] == "01")
        rates = {slot["start_time"]: slot["hourly_rate"] for slot in championship["slots"] if slot["hourly_rate"] is not None}
        assert rates["17:00"] == "2000.00"
        assert rates["19:00"] == "2200.00"
        assert rates["21:00"] == "2000.00"


def test_policy_login_quote_and_booking() -> None:
    with TestClient(app) as client:
        login = client.post("/api/v1/auth/login", json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"})
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

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

        create_payload = {**payload, "policy_version_id": policy.json()["id"], "policy_accepted": True}
        created = client.post("/api/v1/bookings", json=create_payload, headers=headers)
        assert created.status_code == 200
        assert created.json()["status"] == "pending_payment"

        mine = client.get("/api/v1/bookings/me", headers=headers)
        assert mine.status_code == 200
        assert any(b["id"] == created.json()["id"] for b in mine.json())

        conflict = client.post("/api/v1/bookings/quote", json=payload)
        assert conflict.status_code == 409
