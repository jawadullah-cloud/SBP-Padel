from fastapi.testclient import TestClient

import app.api.auth as auth_api
from app.main import app


async def existing_google_claims(_: str) -> dict:
    return {
        "sub": "google-existing",
        "email": "player@sbppadel.local",
        "name": "Existing Player",
        "picture": None,
    }


async def new_google_claims(_: str) -> dict:
    return {
        "sub": "google-new",
        "email": "google.player@example.com",
        "name": "Google Player",
        "picture": None,
    }


def test_google_login_links_existing_player(monkeypatch) -> None:
    monkeypatch.setattr(auth_api, "verify_google_id_token", existing_google_claims)
    with TestClient(app) as client:
        password_login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "player@sbppadel.local", "password": "PadelDemo2026!"},
        )
        assert password_login.status_code == 200
        expected_id = password_login.json()["user"]["id"]

        google_login = client.post(
            "/api/v1/auth/google", json={"credential": "x" * 80}
        )
        assert google_login.status_code == 200
        assert google_login.json()["user"]["id"] == expected_id
        assert google_login.json()["user"]["email"] == "player@sbppadel.local"


def test_google_login_creates_and_reuses_new_player(monkeypatch) -> None:
    monkeypatch.setattr(auth_api, "verify_google_id_token", new_google_claims)
    with TestClient(app) as client:
        first = client.post("/api/v1/auth/google", json={"credential": "y" * 80})
        assert first.status_code == 200
        first_user = first.json()["user"]
        assert first_user["email"] == "google.player@example.com"
        assert first_user["full_name"] == "Google Player"
        assert first_user["role"] == "player"

        second = client.post("/api/v1/auth/google", json={"credential": "z" * 80})
        assert second.status_code == 200
        assert second.json()["user"]["id"] == first_user["id"]

        password_login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "google.player@example.com", "password": "Anything2026!"},
        )
        assert password_login.status_code == 401
