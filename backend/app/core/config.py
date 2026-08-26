from functools import lru_cache
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change-this-in-production"


class Settings(BaseSettings):
    app_name: str = "SBP Padel API"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./sbp_padel.db"
    redis_url: str | None = None
    redis_required: bool = False
    timezone: str = "Asia/Karachi"
    cors_origins: str = (
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60 * 24 * 7
    service_fee: int = 100
    slot_hold_minutes: int = 10
    password_reset_minutes: int = 10
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_starttls: bool = True
    google_client_id: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def validate_runtime_settings(config: Settings) -> None:
    """Fail fast on configuration that is unsafe outside local development/test."""
    environment = config.environment.strip().lower()
    if environment in {"development", "test"}:
        return

    problems: list[str] = []
    if config.jwt_secret == DEFAULT_JWT_SECRET or len(config.jwt_secret.strip()) < 32:
        problems.append("JWT_SECRET must be explicitly configured and at least 32 characters")

    database_scheme = urlparse(config.database_url).scheme.lower()
    if not database_scheme.startswith("postgresql"):
        problems.append("DATABASE_URL must use PostgreSQL outside development/test")

    origins = config.cors_origin_list
    if not origins:
        problems.append("CORS_ORIGINS must contain at least one explicit origin")
    for origin in origins:
        parsed = urlparse(origin)
        host = (parsed.hostname or "").lower()
        if origin == "*" or parsed.scheme != "https":
            problems.append("CORS_ORIGINS must use explicit HTTPS origins outside development/test")
            break
        if host in {"localhost", "127.0.0.1", "0.0.0.0"}:
            problems.append("CORS_ORIGINS must not contain localhost origins outside development/test")
            break

    if config.redis_required and not config.redis_url:
        problems.append("REDIS_URL is required when REDIS_REQUIRED=true")

    if config.access_token_minutes <= 0:
        problems.append("ACCESS_TOKEN_MINUTES must be positive")
    if config.slot_hold_minutes <= 0:
        problems.append("SLOT_HOLD_MINUTES must be positive")
    if config.password_reset_minutes <= 0:
        problems.append("PASSWORD_RESET_MINUTES must be positive")

    if environment == "production":
        if not config.smtp_host or not config.smtp_from_email:
            problems.append("SMTP_HOST and SMTP_FROM_EMAIL are required in production")

    if problems:
        raise RuntimeError("Invalid SBP-Padel runtime configuration: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
