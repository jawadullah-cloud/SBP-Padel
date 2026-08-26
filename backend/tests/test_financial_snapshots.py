from fastapi.testclient import TestClient

from app.main import app


def login(client: TestClient, identifier: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_service_fee_is_snapshotted_on_booking_and_new_quotes_use_latest_fee():
    with TestClient(app) as client:
        admin = login(client, "admin@sbppadel.local", "PadelAdmin2026!")
        player = login(client, "player@sbppadel.local", "PadelDemo2026!")
        policy = client.get("/api/v1/policies/active").json()
        venue = next(v for v in client.get("/api/v1/venues").json() if v["name"] == "Nishtar Park Sports Complex")
        detail = client.get(f"/api/v1/venues/{venue['id']}").json()
        court_id = next(c["id"] for c in detail["courts"] if c["code"] == "04")

        first_fee = client.patch(
            "/api/v1/admin/platform-settings/service-fee",
            headers=admin,
            json={"service_fee": 160},
        )
        assert first_fee.status_code == 200

        created = client.post(
            "/api/v1/bookings",
            headers=player,
            json={
                "venue_id": venue["id"],
                "court_id": court_id,
                "booking_date": "2026-12-22",
                "slots": [{"start_time": "16:00"}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
        )
        assert created.status_code == 200

        second_fee = client.patch(
            "/api/v1/admin/platform-settings/service-fee",
            headers=admin,
            json={"service_fee": 240},
        )
        assert second_fee.status_code == 200

        historical = client.get(f"/api/v1/bookings/{created.json()['id']}", headers=player)
        assert historical.status_code == 200
        assert historical.json()["service_fee"] == "160.00"

        new_quote = client.post(
            "/api/v1/bookings/quote",
            json={
                "venue_id": venue["id"],
                "court_id": court_id,
                "booking_date": "2026-12-23",
                "slots": [{"start_time": "16:00"}],
            },
        )
        assert new_quote.status_code == 200
        assert new_quote.json()["service_fee"] == "240.00"

        reset = client.patch(
            "/api/v1/admin/platform-settings/service-fee",
            headers=admin,
            json={"service_fee": 100},
        )
        assert reset.status_code == 200
