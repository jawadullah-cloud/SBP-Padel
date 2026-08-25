from fastapi.testclient import TestClient

from app.main import app


def test_disabled_staff_account_cannot_log_in() -> None:
    email = "disabled-login-test@sbppadel.local"
    password = "Disabled2026!"
    with TestClient(app) as client:
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"identifier": "admin@sbppadel.local", "password": "PadelAdmin2026!"},
        )
        assert admin_login.status_code == 200
        headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        created = client.post(
            "/api/v1/admin/staff",
            headers=headers,
            json={
                "full_name": "Disabled Login Test",
                "email": email,
                "password": password,
                "role": "venue_operator",
            },
        )
        if created.status_code == 409:
            staff = client.get("/api/v1/admin/staff", headers=headers).json()
            user_id = next(row["id"] for row in staff if row["email"] == email)
            client.patch(
                f"/api/v1/admin/staff/{user_id}/active",
                headers=headers,
                json={"is_active": True},
            )
        else:
            assert created.status_code == 200, created.text
            user_id = created.json()["id"]

        active_login = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": password}
        )
        assert active_login.status_code == 200, active_login.text

        disabled = client.patch(
            f"/api/v1/admin/staff/{user_id}/active",
            headers=headers,
            json={"is_active": False},
        )
        assert disabled.status_code == 200, disabled.text
        assert disabled.json()["is_active"] is False

        blocked = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": password}
        )
        assert blocked.status_code == 403
        assert "disabled" in blocked.json()["detail"].lower()

        token_blocked = client.post(
            "/api/v1/auth/token",
            data={"username": email, "password": password},
        )
        assert token_blocked.status_code == 403
