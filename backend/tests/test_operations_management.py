from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_front_desk_booking_pricing_finance_refund_and_report() -> None:
    with TestClient(app) as client:
        manager = auth(client, "manager@sbppadel.local", "PadelManager2026!")
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")
        player = auth(client, "player@sbppadel.local", "PadelDemo2026!")

        venue_id = client.get("/api/v1/operations/my-venues", headers=manager).json()[0]["id"]
        courts = client.get(f"/api/v1/operations/courts?venue_id={venue_id}", headers=manager).json()
        court_id = next(row["id"] for row in courts if row["code"] == "05")

        players = client.get(
            "/api/v1/operations/players/search",
            headers=operator,
            params={"venue_id": venue_id, "q": "player@sbppadel.local"},
        )
        assert players.status_code == 200, players.text
        player_id = players.json()[0]["id"]

        created = client.post(
            "/api/v1/operations/bookings/front-desk",
            headers=operator,
            json={
                "venue_id": venue_id,
                "player_id": player_id,
                "court_id": court_id,
                "booking_date": "2026-09-18",
                "slots": ["18:00"],
                "payment_method": "cash",
                "payment_reference": "COUNTER-QA-001",
                "policy_acknowledged": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()
        assert booking["status"] == "confirmed"
        assert booking["payment_status"] == "paid"
        assert booking["payment_reference"] == "COUNTER-QA-001"

        feed = client.get(
            "/api/v1/operations/bookings",
            headers=manager,
            params={"venue_id": venue_id, "q": booking["booking_code"]},
        )
        assert feed.status_code == 200
        assert feed.json()[0]["payment_reference"] == "COUNTER-QA-001"
        assert feed.json()[0]["player"]["email"] == "player@sbppadel.local"

        finance = client.get(
            "/api/v1/operations/finance",
            headers=operator,
            params={"venue_id": venue_id, "from_date": "2026-09-18", "to_date": "2026-09-18"},
        )
        assert finance.status_code == 200, finance.text
        assert any(row["booking_code"] == booking["booking_code"] for row in finance.json()["transactions"])

        report = client.get(
            "/api/v1/operations/reports/summary",
            headers=operator,
            params={"venue_id": venue_id, "from_date": "2026-09-18", "to_date": "2026-09-18"},
        )
        assert report.status_code == 200, report.text
        assert report.json()["active_bookings"] >= 1
        assert report.json()["booked_hours"] >= 1

        rules = client.get(f"/api/v1/operations/pricing-rules?venue_id={venue_id}", headers=operator)
        assert rules.status_code == 200
        denied = client.post(
            "/api/v1/operations/pricing-rules",
            headers=operator,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "weekdays": [0, 1, 2, 3, 4, 5, 6],
                "start_time": "06:00",
                "end_time": "07:00",
                "hourly_rate": "1750.00",
                "priority": 250,
            },
        )
        assert denied.status_code == 403
        rule = client.post(
            "/api/v1/operations/pricing-rules",
            headers=manager,
            json={
                "venue_id": venue_id,
                "court_id": court_id,
                "valid_from": "2026-10-01",
                "valid_to": "2026-10-31",
                "weekdays": [0, 1, 2, 3, 4],
                "start_time": "06:00",
                "end_time": "07:00",
                "hourly_rate": "1750.00",
                "priority": 250,
            },
        )
        assert rule.status_code == 200, rule.text
        removed = client.delete(f"/api/v1/operations/pricing-rules/{rule.json()['id']}", headers=manager)
        assert removed.status_code == 200

        cancelled = client.post(
            f"/api/v1/bookings/{booking['id']}/cancel",
            headers=player,
            json={"reason": "QA cancellation"},
        )
        assert cancelled.status_code == 200, cancelled.text
        refund = client.post(
            f"/api/v1/payments/{booking['payment_id']}/refund",
            headers=player,
            json={"reason": "QA refund"},
        )
        assert refund.status_code == 200, refund.text

        operator_cannot_process = client.patch(
            f"/api/v1/operations/refunds/{refund.json()['refund_id']}",
            headers=operator,
            json={"status": "processing"},
        )
        assert operator_cannot_process.status_code == 403
        processing = client.patch(
            f"/api/v1/operations/refunds/{refund.json()['refund_id']}",
            headers=manager,
            json={"status": "processing"},
        )
        assert processing.status_code == 200
        completed = client.patch(
            f"/api/v1/operations/refunds/{refund.json()['refund_id']}",
            headers=manager,
            json={"status": "completed", "provider_reference": "REF-QA-001"},
        )
        assert completed.status_code == 200

        finance_after = client.get(
            "/api/v1/operations/finance",
            headers=manager,
            params={"venue_id": venue_id, "from_date": "2026-09-18", "to_date": "2026-09-18"},
        )
        transaction = next(row for row in finance_after.json()["transactions"] if row["booking_code"] == booking["booking_code"])
        assert transaction["refund"]["status"] == "completed"
        assert transaction["refund"]["provider_reference"] == "REF-QA-001"
