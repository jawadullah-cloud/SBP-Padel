from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def auth(client: TestClient, email: str, password: str) -> dict[str, str]:
    response = client.post('/api/v1/auth/login', json={'identifier': email, 'password': password})
    assert response.status_code == 200, response.text
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


def test_operator_can_register_player_and_duplicates_are_blocked() -> None:
    with TestClient(app) as client:
        operator = auth(client, 'operator@sbppadel.local', 'PadelOperator2026!')
        venue_id = client.get('/api/v1/operations/my-venues', headers=operator).json()[0]['id']
        marker = uuid4().hex[:10]
        email = f'walkin-{marker}@example.test'
        phone = f'0300{marker[:7]}'
        created = client.post(
            '/api/v1/operations/players',
            headers=operator,
            json={'venue_id': venue_id, 'full_name': 'Walk In QA Player', 'email': email, 'phone': phone},
        )
        assert created.status_code == 200, created.text
        body = created.json()
        assert body['email'] == email
        assert body['temporary_password'].startswith('Padel-')

        found = client.get(
            '/api/v1/operations/players/search',
            headers=operator,
            params={'venue_id': venue_id, 'q': email},
        )
        assert found.status_code == 200
        assert any(row['id'] == body['id'] for row in found.json())

        duplicate = client.post(
            '/api/v1/operations/players',
            headers=operator,
            json={'venue_id': venue_id, 'full_name': 'Duplicate QA Player', 'email': email, 'phone': None},
        )
        assert duplicate.status_code == 409
