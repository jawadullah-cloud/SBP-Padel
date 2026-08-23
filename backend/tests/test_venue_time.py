from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

import app.api.routes as venue_routes
from app.main import app


def test_elapsed_evening_slots_are_unavailable_in_pakistan_time(monkeypatch) -> None:
    pakistan_time = timezone(timedelta(hours=5), name="PKT")
    fixed_now = datetime(2026, 8, 23, 21, 38, tzinfo=pakistan_time)
    monkeypatch.setattr(venue_routes, "venue_now", lambda venue: fixed_now)

    with TestClient(app) as client:
        venue = client.get("/api/v1/venues").json()[0]
        response = client.get(
            f"/api/v1/venues/{venue['id']}/availability?date=2026-08-23"
        )
        assert response.status_code == 200
        court = response.json()["courts"][0]
        six_pm = next(slot for slot in court["slots"] if slot["start_time"] == "18:00")
        ten_pm = next(slot for slot in court["slots"] if slot["start_time"] == "22:00")

        assert six_pm["available"] is False
        assert six_pm["unavailable_reason"] == "Unavailable"
        assert ten_pm["available"] is True


def test_karachi_timezone_has_windows_safe_fallback(monkeypatch) -> None:
    venue = type("VenueStub", (), {"timezone": "Asia/Karachi"})()

    def missing_zone(_name: str):
        raise venue_routes.ZoneInfoNotFoundError

    monkeypatch.setattr(venue_routes, "ZoneInfo", missing_zone)
    tz = venue_routes.venue_timezone(venue)

    assert tz.utcoffset(None) == timedelta(hours=5)
