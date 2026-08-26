from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post('/api/v1/auth/login', json={'identifier': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


def test_active_booking_blocks_closure_court_shutdown_and_venue_deactivation() -> None:
    with TestClient(app) as client:
        manager = auth(client, 'manager@sbppadel.local', 'PadelManager2026!')
        operator = auth(client, 'operator@sbppadel.local', 'PadelOperator2026!')
        admin = auth(client, 'admin@sbppadel.local', 'PadelAdmin2026!')

        venue = client.get('/api/v1/operations/my-venues', headers=manager).json()[0]
        venue_id = venue['id']
        courts = client.get(f'/api/v1/operations/courts?venue_id={venue_id}', headers=manager).json()
        court = next(row for row in courts if row['code'] == '04')
        players = client.get(
            '/api/v1/operations/players/search',
            headers=operator,
            params={'venue_id': venue_id, 'q': 'player@sbppadel.local'},
        ).json()
        player_id = players[0]['id']

        booking_date = '2027-01-15'
        created = client.post(
            '/api/v1/operations/bookings/front-desk',
            headers=manager,
            json={
                'venue_id': venue_id,
                'player_id': player_id,
                'court_id': court['id'],
                'booking_date': booking_date,
                'slots': ['17:00'],
                'payment_method': 'cash',
                'payment_reference': 'CLOSURE-GUARD-QA',
                'policy_acknowledged': True,
            },
        )
        assert created.status_code == 200, created.text

        closure = client.post(
            '/api/v1/operations/blocks',
            headers=manager,
            json={
                'venue_id': venue_id,
                'court_id': court['id'],
                'block_date': booking_date,
                'start_time': '16:30',
                'end_time': '18:30',
                'block_type': 'maintenance',
                'reason': 'QA maintenance closure',
            },
        )
        assert closure.status_code == 409, closure.text
        assert 'active booking' in closure.json()['detail'].lower()

        court_shutdown = client.patch(
            f"/api/v1/operations/courts/{court['id']}/status",
            headers=manager,
            json={'status': 'maintenance'},
        )
        assert court_shutdown.status_code == 409, court_shutdown.text
        assert 'active current/future booking' in court_shutdown.json()['detail'].lower()

        venue_shutdown = client.patch(
            f'/api/v1/admin/venues/{venue_id}/status',
            headers=admin,
            json={'is_active': False},
        )
        assert venue_shutdown.status_code == 409, venue_shutdown.text
        assert 'active current/future booking' in venue_shutdown.json()['detail'].lower()
