from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_manager_can_cancel_paid_booking_and_operator_cannot() -> None:
    with TestClient(app) as client:
        manager = auth(client, "manager@sbppadel.local", "PadelManager2026!")
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")
        venue_id = client.get("/api/v1/operations/my-venues", headers=manager).json()[0]["id"]
        courts = client.get(f"/api/v1/operations/courts?venue_id={venue_id}", headers=manager).json()
        court_id = next(row["id"] for row in courts if row["code"] == "05")
        players = client.get(
            "/api/v1/operations/players/search",
            headers=operator,
            params={"venue_id": venue_id, "q": "player@sbppadel.local"},
        ).json()
        player_id = players[0]["id"]
        created = client.post(
            "/api/v1/operations/bookings/front-desk",
            headers=operator,
            json={
                "venue_id": venue_id,
                "player_id": player_id,
                "court_id": court_id,
                "booking_date": "2026-10-16",
                "slots": ["18:00"],
                "payment_method": "cash",
                "payment_reference": "OPS-CANCEL-QA",
                "policy_acknowledged": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()

        denied = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/cancel",
            headers=operator,
            json={"reason": "Operator should not be allowed"},
        )
        assert denied.status_code == 403

        cancelled = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/cancel",
            headers=manager,
            json={"reason": "Venue operational closure"},
        )
        assert cancelled.status_code == 200, cancelled.text
        payload = cancelled.json()
        assert payload["status"] == "venue_cancelled"
        assert payload["slots_released"] is True
        assert payload["refund_required"] is True
        assert payload["refund_status"] == "requested"

        feed = client.get(
            "/api/v1/operations/bookings",
            headers=manager,
            params={"venue_id": venue_id, "q": booking["booking_code"]},
        )
        assert feed.status_code == 200
        assert feed.json()[0]["status"] == "venue_cancelled"

        finance = client.get(
            "/api/v1/operations/finance",
            headers=manager,
            params={"venue_id": venue_id, "from_date": "2026-10-16", "to_date": "2026-10-16"},
        )
        tx = next(row for row in finance.json()["transactions"] if row["booking_code"] == booking["booking_code"])
        assert tx["refund"]["status"] == "requested"
        assert "Venue cancellation" in tx["refund"]["reason"]

        manager_refunds = client.get(
            "/api/v1/operations/refunds-detailed",
            headers=manager,
            params={"venue_id": venue_id},
        )
        assert manager_refunds.status_code == 200, manager_refunds.text
        refund = next(row for row in manager_refunds.json() if row["booking"]["booking_code"] == booking["booking_code"])
        assert refund["status"] == "requested"
        assert refund["booking"]["court"]
        assert refund["booking"]["player_name"]
        assert refund["booking"]["checked_in"] is False
        assert refund["payment"]["reference"] == "OPS-CANCEL-QA"
        assert refund["booking"]["cutoff_hours"] == 12

        operator_refunds = client.get(
            "/api/v1/operations/refunds-detailed",
            headers=operator,
            params={"venue_id": venue_id},
        )
        assert operator_refunds.status_code == 403

        processed = client.patch(
            f"/api/v1/operations/refunds/{refund['id']}",
            headers=manager,
            json={"status": "processing"},
        )
        assert processed.status_code == 200, processed.text

        again = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/cancel",
            headers=manager,
            json={"reason": "Duplicate cancellation"},
        )
        assert again.status_code == 409
