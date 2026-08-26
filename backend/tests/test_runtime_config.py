import pytest

from app.core.config import DEFAULT_JWT_SECRET, Settings, validate_runtime_settings


def production_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "database_url": "postgresql+asyncpg://sbp:secret@db.example/sbp_padel",
        "jwt_secret": "sbp-padel-production-secret-change-managed-externally",
        "cors_origins": "https://admin.example,https://player.example",
        "trusted_hosts": "api.example",
        "smtp_host": "smtp.example",
        "smtp_from_email": "no-reply@example",
    }
    values.update(overrides)
    return Settings(**values)


def test_development_allows_local_default_secret() -> None:
    validate_runtime_settings(Settings(environment="development", jwt_secret=DEFAULT_JWT_SECRET))


def test_production_rejects_default_jwt_secret() -> None:
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_runtime_settings(production_settings(jwt_secret=DEFAULT_JWT_SECRET))


def test_production_accepts_complete_safe_configuration() -> None:
    validate_runtime_settings(production_settings())
