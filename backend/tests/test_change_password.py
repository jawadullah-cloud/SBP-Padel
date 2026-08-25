from fastapi.testclient import TestClient

from app.main import app


def test_authenticated_password_change() -> None:
    email = "change-password-test@sbppadel.local"
    original = "Original2026!"
    changed = "Changed2026!"
    with TestClient(app) as client:
        registered = client.post(
            "/api/v1/auth/register",
            json={"full_name": "Password Test", "email": email, "password": original},
        )
        assert registered.status_code == 200
        token = registered.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        wrong = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={"current_password": "Wrong2026!", "new_password": changed},
        )
        assert wrong.status_code == 400
        assert "Current password" in wrong.json()["detail"]

        same = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={"current_password": original, "new_password": original},
        )
        assert same.status_code == 400

        updated = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={"current_password": original, "new_password": changed},
        )
        assert updated.status_code == 200

        old_login = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": original}
        )
        assert old_login.status_code == 401
        new_login = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": changed}
        )
        assert new_login.status_code == 200
