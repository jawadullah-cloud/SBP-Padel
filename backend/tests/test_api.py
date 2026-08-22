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
        assert len(data) >= 1
        venue = next(v for v in data if v["name"] == "Nishtar Park Sports Complex")

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
