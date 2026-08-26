from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post('/api/v1/auth/login', json={'identifier': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


def test_staff_reschedule_releases_original_slot_and_blocks_replacement() -> None:
    with TestClient(app) as client:
        manager = auth(client, 'manager@sbppadel.local', 'PadelManager2026!')
        operator = auth(client, 'operator@sbppadel.local', 'PadelOperator2026!')
        venue_id = client.get('/api/v1/operations/my-venues', headers=manager).json()[0]['id']
        players = client.get(
            '/api/v1/operations/players/search',
            headers=operator,
            params={'venue_id': venue_id, 'q': 'player@sbppadel.local'},
        )
        assert players.status_code == 200, players.text
        player_id = players.json()[0]['id']

        target_date = '2026-09-24'
        availability = client.get(f'/api/v1/venues/{venue_id}/availability', params={'date': target_date})
        assert availability.status_code == 200, availability.text
        courts = availability.json()['courts']

        candidates = []
        for court in courts:
            for slot in court['slots']:
                if slot['available'] and slot.get('hourly_rate'):
                    candidates.append((court['court_id'], slot['start_time'], slot['hourly_rate']))
        assert len(candidates) >= 2

        original = candidates[0]
        replacement = next(
            item for item in candidates[1:]
            if item[2] == original[2] and (item[0] != original[0] or item[1] != original[1])
        )

        created = client.post(
            '/api/v1/operations/bookings/front-desk',
            headers=operator,
            json={
                'venue_id': venue_id,
                'player_id': player_id,
                'court_id': original[0],
                'booking_date': target_date,
                'slots': [original[1]],
                'payment_method': 'cash',
                'payment_reference': 'RESCHEDULE-RELEASE-QA',
                'policy_acknowledged': True,
            },
        )
        assert created.status_code == 200, created.text
        booking_id = created.json()['id']

        before = client.get(f'/api/v1/venues/{venue_id}/availability', params={'date': target_date}).json()['courts']
        old_before = next(c for c in before if c['court_id'] == original[0])
        assert next(s for s in old_before['slots'] if s['start_time'] == original[1])['available'] is False

        moved = client.post(
            f'/api/v1/operations/bookings/{booking_id}/reschedule',
            headers=manager,
            json={
                'court_id': replacement[0],
                'booking_date': target_date,
                'slots': [replacement[1]],
                'reason': 'QA maintenance move',
            },
        )
        assert moved.status_code == 200, moved.text
        assert moved.json()['status'] == 'rescheduled'

        after = client.get(f'/api/v1/venues/{venue_id}/availability', params={'date': target_date})
        assert after.status_code == 200, after.text
        rows = after.json()['courts']
        old_court = next(c for c in rows if c['court_id'] == original[0])
        new_court = next(c for c in rows if c['court_id'] == replacement[0])
        old_slot = next(s for s in old_court['slots'] if s['start_time'] == original[1])
        new_slot = next(s for s in new_court['slots'] if s['start_time'] == replacement[1])
        assert old_slot['available'] is True
        assert new_slot['available'] is False
        assert new_slot['unavailable_reason'] == 'Booked'
