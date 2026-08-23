from fastapi.testclient import TestClient

from app.main import app


def player_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_player_avatar_round_trip() -> None:
    with TestClient(app) as client:
        headers = player_headers(client)
        clear = client.delete("/api/v1/auth/me/avatar", headers=headers)
        assert clear.status_code == 200

        before = client.get("/api/v1/auth/me", headers=headers)
        assert before.status_code == 200
        assert before.json()["avatar_data_url"] is None

        avatar = "data:image/jpeg;base64," + ("A" * 64)
        saved = client.put(
            "/api/v1/auth/me/avatar",
            headers=headers,
            json={"avatar_data_url": avatar},
        )
        assert saved.status_code == 200, saved.text
        assert saved.json()["avatar_data_url"] == avatar

        after = client.get("/api/v1/auth/me", headers=headers)
        assert after.status_code == 200
        assert after.json()["avatar_data_url"] == avatar

        removed = client.delete("/api/v1/auth/me/avatar", headers=headers)
        assert removed.status_code == 200
        assert removed.json()["avatar_data_url"] is None

        final = client.get("/api/v1/auth/me", headers=headers)
        assert final.status_code == 200
        assert final.json()["avatar_data_url"] is None
