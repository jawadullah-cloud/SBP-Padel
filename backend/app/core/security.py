from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from jwt.exceptions import PyJWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.domain import User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/token")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    return bool(password_hash) and pwd_context.verify(password, password_hash)


def _token_minutes_for(role: str) -> int:
    if role in {UserRole.admin.value, UserRole.venue_manager.value, UserRole.venue_operator.value}:
        return settings.staff_access_token_minutes
    return settings.access_token_minutes


def create_access_token(user_id: UUID, role: str, token_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=_token_minutes_for(role))
    payload = {
        "sub": str(user_id),
        "role": role,
        "ver": int(token_version),
        "iat": now,
        "exp": expires,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def current_user(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = UUID(payload.get("sub", ""))
        token_version = int(payload.get("ver", -1))
    except (PyJWTError, ValueError, TypeError):
        raise credentials_error
    user = await db.get(User, user_id)
    if not user or not user.is_active or token_version != int(user.token_version or 0):
        raise credentials_error
    return user


def require_roles(*roles: UserRole) -> Callable:
    allowed = set(roles)

    async def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency
