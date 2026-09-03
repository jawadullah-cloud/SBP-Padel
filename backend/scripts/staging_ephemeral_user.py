from __future__ import annotations

import asyncio
import os
import sys

from sqlalchemy import delete, select

from app.core.config import settings, validate_runtime_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.domain import User, UserRole

CONFIRMATION = "SBP_PADEL_EPHEMERAL_UAT_ONLY"
ALLOWED_SUFFIX = "@sbp-padel-uat.invalid"


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required.")
    return value


def _guard() -> tuple[str, str]:
    validate_runtime_settings(settings)
    if settings.environment.strip().lower() != "staging":
        raise RuntimeError("Ephemeral UAT users may be managed only with ENVIRONMENT=staging.")
    if os.getenv("SBP_PADEL_EPHEMERAL_CONFIRM", "") != CONFIRMATION:
        raise RuntimeError("Explicit ephemeral-UAT confirmation is required.")
    email = _required("SBP_PADEL_EPHEMERAL_EMAIL").lower()
    if not email.endswith(ALLOWED_SUFFIX):
        raise RuntimeError(f"Ephemeral UAT email must end with {ALLOWED_SUFFIX}.")
    return email, os.getenv("SBP_PADEL_EPHEMERAL_PASSWORD", "")


async def create_user(role_name: str) -> None:
    email, password = _guard()
    if len(password) < 12:
        raise RuntimeError("A strong generated ephemeral password is required for creation.")
    try:
        role = UserRole(role_name)
    except ValueError as exc:
        raise RuntimeError("Unsupported ephemeral role.") from exc
    if role not in {UserRole.admin, UserRole.player}:
        raise RuntimeError("Only admin or player ephemeral UAT roles are permitted.")

    async with SessionLocal() as session:
        existing = await session.scalar(select(User.id).where(User.email == email))
        if existing is not None:
            raise RuntimeError("Ephemeral UAT email already exists; refusing to overwrite it.")
        session.add(
            User(
                full_name=f"Ephemeral Staging {role.value.title()} UAT",
                email=email,
                password_hash=hash_password(password),
                role=role,
                is_active=True,
            )
        )
        await session.commit()
    print(f"Created ephemeral staging {role.value} account: {email}")


async def delete_user() -> None:
    email, _ = _guard()
    async with SessionLocal() as session:
        await session.execute(delete(User).where(User.email == email))
        await session.commit()
    print(f"Removed ephemeral staging UAT account: {email}")


async def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in {"create", "delete"}:
        raise RuntimeError("Usage: staging_ephemeral_user.py create <admin|player> | delete")
    if sys.argv[1] == "create":
        if len(sys.argv) != 3:
            raise RuntimeError("Create requires an explicit admin or player role.")
        await create_user(sys.argv[2])
    else:
        await delete_user()


if __name__ == "__main__":
    asyncio.run(main())
