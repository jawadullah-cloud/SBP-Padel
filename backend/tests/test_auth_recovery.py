from fastapi.testclient import TestClient

import app.api.auth as auth_api
from app.main import app


def test_password_policy_and_email_otp_reset(monkeypatch) -> None:
    delivered: dict[str, str] = {}

    async def fake_send_email(to_email: str, subject: str, body: str) -> bool:
        delivered.update(to=to_email, subject=subject, body=body)
        return True

    monkeypatch.setattr(auth_api, "send_email", fake_send_email)
    monkeypatch.setattr(auth_api.secrets, "randbelow", lambda _limit: 123456)

    with TestClient(app) as client:
        weak = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Recovery Test",
                "email": "recovery-test@sbppadel.local",
                "password": "password",
            },
        )
        assert weak.status_code == 400
        assert "uppercase" in weak.json()["detail"]

        registered = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Recovery Test",
                "email": "recovery-test@sbppadel.local",
                "password": "Original2026!",
            },
        )
        assert registered.status_code == 200

        forgot = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "recovery-test@sbppadel.local"},
        )
        assert forgot.status_code == 200
        challenge = forgot.json()["challenge"]
        assert delivered["to"] == "recovery-test@sbppadel.local"
        assert "123456" in delivered["body"]

        bad_code = client.post(
            "/api/v1/auth/reset-password",
            json={
                "challenge": challenge,
                "otp": "654321",
                "new_password": "Changed2026!",
            },
        )
        assert bad_code.status_code == 400

        reset = client.post(
            "/api/v1/auth/reset-password",
            json={
                "challenge": challenge,
                "otp": "123456",
                "new_password": "Changed2026!",
            },
        )
        assert reset.status_code == 200

        old_login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "recovery-test@sbppadel.local", "password": "Original2026!"},
        )
        assert old_login.status_code == 401
        new_login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "recovery-test@sbppadel.local", "password": "Changed2026!"},
        )
        assert new_login.status_code == 200

        reused = client.post(
            "/api/v1/auth/reset-password",
            json={
                "challenge": challenge,
                "otp": "123456",
                "new_password": "Another2026!",
            },
        )
        assert reused.status_code == 400
        assert "already been used" in reused.json()["detail"]


def test_reset_challenge_has_its_own_attempt_limit(monkeypatch) -> None:
    async def fake_send_email(_to_email: str, _subject: str, _body: str) -> bool:
        return True

    monkeypatch.setattr(auth_api, "send_email", fake_send_email)
    monkeypatch.setattr(auth_api.secrets, "randbelow", lambda _limit: 123456)

    with TestClient(app) as client:
        registered = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "OTP Guess Test",
                "email": "otp-guess-test@sbppadel.local",
                "password": "Original2026!",
            },
        )
        assert registered.status_code == 200

        forgot = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "otp-guess-test@sbppadel.local"},
        )
        assert forgot.status_code == 200
        challenge = forgot.json()["challenge"]

        monkeypatch.setattr(auth_api.settings, "environment", "staging")
        monkeypatch.setattr(auth_api.settings, "reset_code_attempts", 2)

        for otp in ("000001", "000002"):
            attempt = client.post(
                "/api/v1/auth/reset-password",
                json={
                    "challenge": challenge,
                    "otp": otp,
                    "new_password": "Changed2026!",
                },
            )
            assert attempt.status_code == 400

        blocked = client.post(
            "/api/v1/auth/reset-password",
            json={
                "challenge": challenge,
                "otp": "123456",
                "new_password": "Changed2026!",
            },
        )
        assert blocked.status_code == 429
