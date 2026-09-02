from fastapi.testclient import TestClient

from app.main import app


def admin_headers(client: TestClient) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin@sbppadel.local", "password": "PadelAdmin2026!"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


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

        weak = client.post(
            "/api/v1/auth/change-password",
            headers=headers,
            json={"current_password": original, "new_password": "alllowercase"},
        )
        assert weak.status_code == 400
        assert "Password must include" in weak.json()["detail"]

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

        revoked = client.get("/api/v1/auth/me", headers=headers)
        assert revoked.status_code == 401

        old_login = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": original}
        )
        assert old_login.status_code == 401
        new_login = client.post(
            "/api/v1/auth/login", json={"identifier": email, "password": changed}
        )
        assert new_login.status_code == 200


def test_manager_and_operator_self_service_change_password_and_admin_reset_remain_separate() -> None:
    with TestClient(app) as client:
        admin = admin_headers(client)
        cases = [
            ("venue_manager", "password-manager@sbppadel.local"),
            ("venue_operator", "password-operator@sbppadel.local"),
        ]

        for role, email in cases:
            original = "Temporary2026!"
            changed = "ChangedStaff2026!"
            reset = "AdminReset2026!"
            created = client.post(
                "/api/v1/admin/staff",
                headers=admin,
                json={
                    "full_name": f"Password {role}",
                    "email": email,
                    "password": original,
                    "role": role,
                },
            )
            assert created.status_code == 200
            user_id = created.json()["id"]

            login = client.post(
                "/api/v1/auth/login", json={"identifier": email, "password": original}
            )
            assert login.status_code == 200
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

            wrong = client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={"current_password": "Wrong2026!", "new_password": changed},
            )
            assert wrong.status_code == 400

            weak = client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={"current_password": original, "new_password": "weakpassword"},
            )
            assert weak.status_code == 400

            updated = client.post(
                "/api/v1/auth/change-password",
                headers=headers,
                json={"current_password": original, "new_password": changed},
            )
            assert updated.status_code == 200
            assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
            assert client.post(
                "/api/v1/auth/login", json={"identifier": email, "password": original}
            ).status_code == 401
            changed_login = client.post(
                "/api/v1/auth/login", json={"identifier": email, "password": changed}
            )
            assert changed_login.status_code == 200
            changed_headers = {
                "Authorization": f"Bearer {changed_login.json()['access_token']}"
            }

            admin_reset = client.patch(
                f"/api/v1/admin/staff/{user_id}/password",
                headers=admin,
                json={"password": reset},
            )
            assert admin_reset.status_code == 200
            assert admin_reset.json()["password_reset"] is True
            assert client.get("/api/v1/auth/me", headers=changed_headers).status_code == 401
            assert client.post(
                "/api/v1/auth/login", json={"identifier": email, "password": changed}
            ).status_code == 401
            assert client.post(
                "/api/v1/auth/login", json={"identifier": email, "password": reset}
            ).status_code == 200
