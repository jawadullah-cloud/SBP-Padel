from datetime import date,time
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app.core.config import settings
from app.core.slot_locks import slot_locks
from app.main import app

def admin_headers(client:TestClient)->dict[str,str]:
    r=client.post('/api/v1/auth/login',json={'identifier':'admin@sbppadel.local','password':'PadelAdmin2026!'});assert r.status_code==200;return {'Authorization':f"Bearer {r.json()['access_token']}"}
def test_finance_reconciliation_audit_and_reports():
    with TestClient(app) as client:
        h=admin_headers(client);summary=client.get('/api/v1/admin/finance/summary',params={'from_date':'2026-08-01','to_date':'2026-12-31'},headers=h);assert summary.status_code==200;assert summary.json()['currency']=='PKR';batch=client.post('/api/v1/admin/finance/reconciliation-batches',params={'from_date':'2026-08-01','to_date':'2026-12-31'},headers=h);assert batch.status_code==200;batches=client.get('/api/v1/admin/finance/reconciliation-batches',headers=h);assert any(r['id']==batch.json()['id'] for r in batches.json());reports=client.get('/api/v1/admin/reports/venue-performance',params={'from_date':'2026-08-01','to_date':'2026-12-31'},headers=h);assert any(r['venue_name']=='Nishtar Park Sports Complex' for r in reports.json());audit=client.get('/api/v1/admin/audit',headers=h);actions={r['action'] for r in audit.json()};assert 'finance.reconciliation.generated' in actions
def test_booking_creation_reports_lock_mode():
    with TestClient(app) as client:
        login=client.post('/api/v1/auth/login',json={'identifier':'player@sbppadel.local','password':'PadelDemo2026!'});h={'Authorization':f"Bearer {login.json()['access_token']}"};policy=client.get('/api/v1/policies/active').json();venue=next(v for v in client.get('/api/v1/venues').json() if v['name']=='Nishtar Park Sports Complex');detail=client.get(f"/api/v1/venues/{venue['id']}").json();court_id=next(c['id'] for c in detail['courts'] if c['code']=='04');r=client.post('/api/v1/bookings',json={'venue_id':venue['id'],'court_id':court_id,'booking_date':'2026-12-17','slots':[{'start_time':'16:00'}],'policy_version_id':policy['id'],'policy_accepted':True},headers=h);assert r.status_code==200;assert r.json()['hold_minutes']==10;assert isinstance(r.json()['atomic_lock'],bool)
def test_hq_service_fee_is_persistent_and_drives_player_quote():
    with TestClient(app) as client:
        admin=admin_headers(client)
        current=client.get('/api/v1/admin/platform-settings/service-fee',headers=admin);assert current.status_code==200
        changed=client.patch('/api/v1/admin/platform-settings/service-fee',json={'service_fee':175},headers=admin);assert changed.status_code==200;assert changed.json()['service_fee']==175;assert settings.service_fee==175
        player_login=client.post('/api/v1/auth/login',json={'identifier':'player@sbppadel.local','password':'PadelDemo2026!'});player={'Authorization':f"Bearer {player_login.json()['access_token']}"}
        denied=client.patch('/api/v1/admin/platform-settings/service-fee',json={'service_fee':250},headers=player);assert denied.status_code==403
        venue=next(v for v in client.get('/api/v1/venues').json() if v['name']=='Nishtar Park Sports Complex');detail=client.get(f"/api/v1/venues/{venue['id']}").json();court_id=next(c['id'] for c in detail['courts'] if c['code']=='04')
        quote=client.post('/api/v1/bookings/quote',json={'venue_id':venue['id'],'court_id':court_id,'booking_date':'2026-12-18','slots':[{'start_time':'16:00'}]});assert quote.status_code==200;assert quote.json()['service_fee']=='175.00';assert float(quote.json()['total'])==float(quote.json()['court_fee'])+175
        again=client.get('/api/v1/admin/platform-settings/service-fee',headers=admin);assert again.json()['service_fee']==175
        audit=client.get('/api/v1/admin/audit',headers=admin).json();assert any(row['action']=='platform.service_fee.updated' for row in audit)
        reset=client.patch('/api/v1/admin/platform-settings/service-fee',json={'service_fee':100},headers=admin);assert reset.status_code==200
@pytest.mark.asyncio
async def test_redis_atomic_lock_if_configured():
    if not settings.redis_url:pytest.skip('Redis is not configured')
    court_id=uuid4();day=date(2030,1,1);starts=[time(19,0),time(20,0)];first=await slot_locks.acquire(court_id,day,starts);assert first.acquired is True;second=await slot_locks.acquire(court_id,day,starts);assert second.acquired is False;await slot_locks.release_result(first);third=await slot_locks.acquire(court_id,day,starts);assert third.acquired is True;await slot_locks.release_result(third)