from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, identifier: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_front_desk_booking_uses_latest_persisted_hq_service_fee():
    with TestClient(app) as client:
        admin = auth(client, "admin@sbppadel.local", "PadelAdmin2026!")
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")
        player = auth(client, "player@sbppadel.local", "PadelDemo2026!")

        changed = client.patch(
            "/api/v1/admin/platform-settings/service-fee",
            headers=admin,
            json={"service_fee": 190},
        )
        assert changed.status_code == 200

        venue_id = client.get("/api/v1/operations/my-venues", headers=operator).json()[0]["id"]
        courts = client.get(f"/api/v1/operations/courts?venue_id={venue_id}", headers=operator).json()
        court_id = next(row["id"] for row in courts if row["code"] == "05")
        player_id = client.get(
            "/api/v1/operations/players/search",
            headers=operator,
            params={"venue_id": venue_id, "q": "player@sbppadel.local"},
        ).json()[0]["id"]

        created = client.post(
            "/api/v1/operations/bookings/front-desk",
            headers=operator,
            json={
                "venue_id": venue_id,
                "player_id": player_id,
                "court_id": court_id,
                "booking_date": "2026-12-24",
                "slots": ["18:00"],
                "payment_method": "cash",
                "payment_reference": "FEE-SNAPSHOT-QA",
                "policy_acknowledged": True,
            },
        )
        assert created.status_code == 200, created.text

        detail = client.get(f"/api/v1/bookings/{created.json()['id']}", headers=player)
        assert detail.status_code == 200
        assert detail.json()["service_fee"] == "190.00"

        reset = client.patch(
            "/api/v1/admin/platform-settings/service-fee",
            headers=admin,
            json={"service_fee": 100},
        )
        assert reset.status_code == 200
