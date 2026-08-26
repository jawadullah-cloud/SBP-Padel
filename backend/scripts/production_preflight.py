from __future__ import annotations

from urllib.parse import urlparse

from app.core.config import Settings, validate_runtime_settings


def redact_database_url(value: str) -> str:
    parsed = urlparse(value)
    host = parsed.hostname or "unknown-host"
    port = f":{parsed.port}" if parsed.port else ""
    database = parsed.path.lstrip("/") or "unknown-db"
    return f"{parsed.scheme}://***@{host}{port}/{database}"


def main() -> None:
    config = Settings()
    validate_runtime_settings(config)
    print("SBP-Padel production preflight: PASS")
    print(f"environment={config.environment}")
    print(f"database={redact_database_url(config.database_url)}")
    print(f"cors_origins={','.join(config.cors_origin_list)}")
    print(f"redis_required={config.redis_required}")
    print(f"redis_configured={bool(config.redis_url)}")
    print(f"smtp_configured={bool(config.smtp_host and config.smtp_from_email)}")
    print(f"timezone={config.timezone}")


if __name__ == "__main__":
    main()
