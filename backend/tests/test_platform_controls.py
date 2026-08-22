from datetime import date, time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.slot_locks import slot_locks
from app.main import app


def admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@sbppadel.local", "password": "PadelAdmin2026!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_finance_reconciliation_audit_and_reports() -> None:
    with TestClient(app) as client:
        headers = admin_headers(client)
        summary = client.get(
            "/api/v1/admin/finance/summary",
            params={"from_date": "2026-08-01", "to_date": "2026-12-31"},
            headers=headers,
        )
        assert summary.status_code == 200
        assert summary.json()["currency"] == "PKR"
        assert "net_amount" in summary.json()

        batch = client.post(
            "/api/v1/admin/finance/reconciliation-batches",
            params={"from_date": "2026-08-01", "to_date": "2026-12-31"},
            headers=headers,
        )
        assert batch.status_code == 200
        assert batch.json()["provider"] == "all"

        batches = client.get(
            "/api/v1/admin/finance/reconciliation-batches", headers=headers
        )
        assert batches.status_code == 200
        assert any(row["id"] == batch.json()["id"] for row in batches.json())

        reports = client.get(
            "/api/v1/admin/reports/venue-performance",
            params={"from_date": "2026-08-01", "to_date": "2026-12-31"},
            headers=headers,
        )
        assert reports.status_code == 200
        assert any(row["venue_name"] == "Nishtar Park Sports Complex" for row in reports.json())

        audit = client.get("/api/v1/admin/audit", headers=headers)
        assert audit.status_code == 200
        actions = {row["action"] for row in audit.json()}
        assert "finance.reconciliation.generated" in actions
        assert any(action.startswith("post.admin.finance.reconciliation-batches") for action in actions)


def test_booking_creation_reports_lock_mode() -> None:
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
        )
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        policy = client.get("/api/v1/policies/active").json()
        venue = client.get("/api/v1/venues").json()[0]
        detail = client.get(f"/api/v1/venues/{venue['id']}").json()
        court_id = detail["courts"][3]["id"]
        response = client.post(
            "/api/v1/bookings",
            json={
                "venue_id": venue["id"],
                "court_id": court_id,
                "booking_date": "2026-12-17",
                "slots": [{"start_time": "16:00"}],
                "policy_version_id": policy["id"],
                "policy_accepted": True,
            },
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["hold_minutes"] == 10
        assert isinstance(response.json()["atomic_lock"], bool)


@pytest.mark.asyncio
async def test_redis_atomic_lock_if_configured() -> None:
    if not settings.redis_url:
        pytest.skip("Redis is not configured")
    court_id = uuid4()
    day = date(2030, 1, 1)
    starts = [time(19, 0), time(20, 0)]
    first = await slot_locks.acquire(court_id, day, starts)
    assert first.acquired is True
    assert first.redis_used is True
    second = await slot_locks.acquire(court_id, day, starts)
    assert second.acquired is False
    await slot_locks.release_result(first)
    third = await slot_locks.acquire(court_id, day, starts)
    assert third.acquired is True
    await slot_locks.release_result(third)
