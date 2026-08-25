from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient

import app.api.operations_passes as operations_passes
from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def same_instant(left: str, right: str) -> bool:
    def normalize(value: str) -> datetime:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed
        return parsed.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

    return normalize(left) == normalize(right)


def test_paid_pass_validates_and_check_in_is_idempotent(monkeypatch) -> None:
    with TestClient(app) as client:
        manager = auth(client, "manager@sbppadel.local", "PadelManager2026!")
        operator = auth(client, "operator@sbppadel.local", "PadelOperator2026!")
        venue_id = client.get("/api/v1/operations/my-venues", headers=operator).json()[0]["id"]
        courts = client.get(f"/api/v1/operations/courts?venue_id={venue_id}", headers=operator).json()
        court_id = next(row["id"] for row in courts if row["code"] == "04")
        players = client.get(
            "/api/v1/operations/players/search",
            headers=operator,
            params={"venue_id": venue_id, "q": "player@sbppadel.local"},
        ).json()
        player_id = players[0]["id"]

        booking_date = "2026-11-03"
        created = client.post(
            "/api/v1/operations/bookings/front-desk",
            headers=operator,
            json={
                "venue_id": venue_id,
                "player_id": player_id,
                "court_id": court_id,
                "booking_date": booking_date,
                "slots": ["17:00", "18:00"],
                "payment_method": "cash",
                "payment_reference": "PASS-QA-001",
                "policy_acknowledged": True,
            },
        )
        assert created.status_code == 200, created.text
        booking = created.json()

        monkeypatch.setattr(
            operations_passes,
            "venue_now",
            lambda venue: datetime(2026, 11, 3, 16, 30, tzinfo=ZoneInfo("Asia/Karachi")),
        )
        qr_payload = f"SBPPADEL|{booking['id']}|{booking['booking_code']}"
        validated = client.post(
            "/api/v1/operations/pass/validate",
            headers=operator,
            json={"venue_id": venue_id, "pass_value": qr_payload},
        )
        assert validated.status_code == 200, validated.text
        data = validated.json()
        assert data["valid"] is True
        assert data["can_check_in"] is True
        assert data["reason_code"] == "valid"
        assert data["booking"]["booking_code"] == booking["booking_code"]
        assert data["booking"]["player"]["email"] == "player@sbppadel.local"
        assert data["booking"]["payment_status"] == "paid"
        assert data["booking"]["checked_in"] is False
        assert data["booking"]["slot_count"] == 2
        assert data["booking"]["duration_hours"] == 2

        checked = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/check-in",
            headers=operator,
            json={},
        )
        assert checked.status_code == 200, checked.text
        checked_at = checked.json()["checked_in_at"]

        checked_again = client.post(
            f"/api/v1/operations/bookings/{booking['id']}/check-in",
            headers=manager,
            json={},
        )
        assert checked_again.status_code == 200, checked_again.text
        assert same_instant(checked_again.json()["checked_in_at"], checked_at)

        revalidated = client.post(
            "/api/v1/operations/pass/validate",
            headers=operator,
            json={"venue_id": venue_id, "pass_value": booking["booking_code"]},
        )
        assert revalidated.status_code == 200, revalidated.text
        data = revalidated.json()
        assert data["valid"] is True
        assert data["can_check_in"] is False
        assert data["reason_code"] == "already_checked_in"
        assert data["booking"]["checked_in"] is True
