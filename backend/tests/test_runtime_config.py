import pytest

from app.core.config import DEFAULT_JWT_SECRET, Settings, validate_runtime_settings


def test_development_allows_local_default_secret() -> None:
    validate_runtime_settings(Settings(environment="development", jwt_secret=DEFAULT_JWT_SECRET))


def test_production_rejects_default_jwt_secret() -> None:
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_runtime_settings(Settings(environment="production", jwt_secret=DEFAULT_JWT_SECRET))


def test_production_accepts_explicit_jwt_secret() -> None:
    validate_runtime_settings(
        Settings(environment="production", jwt_secret="sbp-padel-production-secret-change-managed-externally")
    )
