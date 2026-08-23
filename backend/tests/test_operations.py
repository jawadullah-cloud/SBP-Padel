from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_manager_closure_blocks_public_availability_and_quote() -> None:
    with TestClient(app) as client:
        manager = auth(client, "manager@sbppadel.local", "PadelManager2026!")
        player = auth(client, "player@sbppadel.local", "PadelDemo2026!")
        venues = client.get("/api/v1/operations/my-venues", headers=manager)
        assert venues.status_code == 200
        venue_id = venues.json()[0]["id"]
        detail = client.get(f"/api/v1/venues/{venue_id}").json()
        court_id = next(c["id"] for c in detail["courts"] if c["code"] == "03")

        created = client.post(
            "/api/v1/operations/blocks",
            headers=manager,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "block_date": "2026-09-10",
                "start_time": "19:00",
                "end_time": "21:00",
                "block_type": "maintenance",
                "reason": "Scheduled glass inspection",
            },
        )
        assert created.status_code == 200
        block_id = created.json()["id"]

        availability = client.get(
            f"/api/v1/venues/{venue_id}/availability", params={"date": "2026-09-10"}
        )
        court = next(c for c in availability.json()["courts"] if c["court_id"] == court_id)
        slot = next(s for s in court["slots"] if s["start_time"] == "19:00")
        assert slot["available"] is False
        assert slot["unavailable_reason"] == "Scheduled glass inspection"

        quote = client.post(
            "/api/v1/bookings/quote",
            headers=player,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "booking_date": "2026-09-10",
                "slots": [{"start_time": "19:00"}],
            },
        )
        assert quote.status_code == 409

        removed = client.delete(f"/api/v1/operations/blocks/{block_id}", headers=manager)
        assert removed.status_code == 200
        assert removed.json()["is_active"] is False

        quote_after = client.post(
            "/api/v1/bookings/quote",
            headers=player,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "booking_date": "2026-09-10",
                "slots": [{"start_time": "19:00"}],
            },
        )
        assert quote_after.status_code == 200


def test_operator_can_view_but_not_create_closures() -> None:
    with TestClient(app) as client:
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")
        venues = client.get("/api/v1/operations/my-venues", headers=operator)
        assert venues.status_code == 200
        venue_id = venues.json()[0]["id"]
        blocks = client.get(f"/api/v1/operations/blocks?venue_id={venue_id}", headers=operator)
        assert blocks.status_code == 200
        denied = client.post(
            "/api/v1/operations/blocks",
            headers=operator,
            json={
                "venue_id": venue_id,
                "block_date": "2026-09-11",
                "start_time": "18:00",
                "end_time": "19:00",
                "block_type": "official_event",
                "reason": "Reserved for event",
            },
        )
        assert denied.status_code == 403


def test_operations_booking_feed_contains_player_court_and_payment_context() -> None:
    with TestClient(app) as client:
        manager = auth(client, "manager@sbppadel.local", "PadelManager2026!")
        player = auth(client, "player@sbppadel.local", "PadelDemo2026!")
        venue_id = client.get("/api/v1/operations/my-venues", headers=manager).json()[0]["id"]
        venue = client.get(f"/api/v1/venues/{venue_id}").json()
        court = venue["courts"][0]
        policy = client.get("/api/v1/policies/active").json()
        booking_date = "2026-12-18"

        created = client.post(
            "/api/v1/bookings",
            headers=player,
            json={
                "venue_id": venue_id,
                "court_id": court["id"],
                "booking_date": booking_date,
                "slots": [{"start_time": "14:00"}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()
        initiated = client.post(
            "/api/v1/payments/initiate",
            headers=player,
            json={"booking_id": booking["id"], "method": "card"},
        )
        assert initiated.status_code == 200, initiated.text
        payment_id = initiated.json()["payment_id"]
        confirmed = client.post(f"/api/v1/payments/{payment_id}/simulate-success", headers=player)
        assert confirmed.status_code == 200, confirmed.text

        feed = client.get(
            "/api/v1/operations/bookings",
            headers=manager,
            params={"venue_id": venue_id, "booking_date": booking_date, "q": "player@sbppadel.local"},
        )
        assert feed.status_code == 200, feed.text
        row = next(item for item in feed.json() if item["id"] == booking["id"])
        assert row["player"]["full_name"]
        assert row["player"]["email"] == "player@sbppadel.local"
        assert row["court_name"] == court["name"]
        assert row["court_code"] == court["code"]
        assert row["payment_status"] == "paid"
        assert row["payment_method"] == "card"
