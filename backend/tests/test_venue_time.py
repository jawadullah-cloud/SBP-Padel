from datetime import datetime,timedelta,timezone
from fastapi.testclient import TestClient
import app.api.routes as venue_routes
from app.main import app

def test_elapsed_evening_slots_are_hidden_in_pakistan_time(monkeypatch):
    pakistan_time=timezone(timedelta(hours=5),name='PKT');fixed_now=datetime(2026,8,23,21,38,tzinfo=pakistan_time);monkeypatch.setattr(venue_routes,'venue_now',lambda venue:fixed_now)
    with TestClient(app) as client:
        venue=next(v for v in client.get('/api/v1/venues').json() if v['name']=='Nishtar Park Sports Complex');response=client.get(f"/api/v1/venues/{venue['id']}/availability?date=2026-08-23");assert response.status_code==200;court=response.json()['courts'][0];starts={s['start_time'] for s in court['slots']};assert '18:00' not in starts;ten_pm=next(s for s in court['slots'] if s['start_time']=='22:00');assert ten_pm['available'] is True
def test_karachi_timezone_has_windows_safe_fallback(monkeypatch):
    venue=type('VenueStub',(),{'timezone':'Asia/Karachi'})()
    def missing_zone(_name:str):raise venue_routes.ZoneInfoNotFoundError
    monkeypatch.setattr(venue_routes,'ZoneInfo',missing_zone);tz=venue_routes.venue_timezone(venue);assert tz.utcoffset(None)==timedelta(hours=5)
