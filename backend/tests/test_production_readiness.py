import pytest

from app.core.config import DEFAULT_JWT_SECRET, Settings, validate_runtime_settings


def production_settings(**overrides) -> Settings:
    values = {
        "environment": "production",
        "database_url": "postgresql+asyncpg://sbp:secret@db.example/sbp_padel",
        "jwt_secret": "x" * 48,
        "cors_origins": "https://admin.example,https://player.example",
        "smtp_host": "smtp.example",
        "smtp_from_email": "no-reply@example",
    }
    values.update(overrides)
    return Settings(**values)


def test_development_defaults_remain_allowed() -> None:
    validate_runtime_settings(Settings(environment="development"))


def test_production_requires_real_secret() -> None:
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_runtime_settings(production_settings(jwt_secret=DEFAULT_JWT_SECRET))


def test_production_requires_postgresql() -> None:
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        validate_runtime_settings(production_settings(database_url="sqlite+aiosqlite:///./prod.db"))


def test_nonlocal_runtime_rejects_insecure_or_local_cors() -> None:
    with pytest.raises(RuntimeError, match="HTTPS"):
        validate_runtime_settings(production_settings(cors_origins="http://admin.example"))
    with pytest.raises(RuntimeError, match="localhost"):
        validate_runtime_settings(production_settings(cors_origins="https://localhost:3000"))


def test_production_requires_password_reset_email_delivery() -> None:
    with pytest.raises(RuntimeError, match="SMTP_HOST"):
        validate_runtime_settings(production_settings(smtp_host=None, smtp_from_email=None))


def test_redis_requirement_is_explicit() -> None:
    with pytest.raises(RuntimeError, match="REDIS_URL"):
        validate_runtime_settings(production_settings(redis_required=True, redis_url=None))


def test_valid_production_configuration_passes() -> None:
    validate_runtime_settings(production_settings(redis_required=True, redis_url="redis://redis.example:6379/0"))


def test_staging_can_omit_smtp_but_keeps_core_guards() -> None:
    validate_runtime_settings(
        production_settings(environment="staging", smtp_host=None, smtp_from_email=None)
    )
