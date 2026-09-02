import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_email
from app.core.google_auth import verify_google_id_token
from app.core.rate_limit import client_ip, enforce_rate_limit
from app.core.security import create_access_token, current_user, hash_password, verify_password
from app.db.session import get_db
from app.models.domain import User, UserProfile, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


def validate_password_policy(password: str) -> str:
    checks = [
        (len(password) >= 8, "at least 8 characters"),
        (any(char.islower() for char in password), "a lowercase letter"),
        (any(char.isupper() for char in password), "an uppercase letter"),
        (any(char.isdigit() for char in password), "a number"),
        (any(not char.isalnum() for char in password), "a special character"),
    ]
    missing = [label for ok, label in checks if not ok]
    if missing:
        raise HTTPException(400, "Password must include " + ", ".join(missing))
    return password


def _otp_hash(code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), code.encode(), hashlib.sha256).hexdigest()


def _password_fingerprint(password_hash: str | None) -> str:
    return hashlib.sha256((password_hash or "").encode()).hexdigest()


def _validate_image_data_url(value: str) -> str:
    allowed = {
        "data:image/jpeg;base64,": "jpeg",
        "data:image/png;base64,": "png",
        "data:image/webp;base64,": "webp",
    }
    prefix = next((p for p in allowed if value.startswith(p)), None)
    if prefix is None:
        raise HTTPException(400, "Profile picture must be JPEG, PNG or WebP")
    try:
        raw = base64.b64decode(value[len(prefix):], validate=True)
    except Exception:
        raise HTTPException(400, "Profile picture is not valid base64 image data")
    if not raw or len(raw) > 375_000:
        raise HTTPException(400, "Profile picture is too large")
    kind = allowed[prefix]
    valid = (
        (kind == "jpeg" and raw.startswith(b"\xff\xd8\xff"))
        or (kind == "png" and raw.startswith(b"\x89PNG\r\n\x1a\n"))
        or (kind == "webp" and len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
    )
    if not valid:
        raise HTTPException(400, "Profile picture content does not match its declared image type")
    return value


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=50, max_length=5000)


class AvatarRequest(BaseModel):
    avatar_data_url: str = Field(min_length=20, max_length=500_000)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)


class ResetPasswordRequest(BaseModel):
    challenge: str = Field(min_length=20, max_length=5000)
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


async def authenticate(identifier: str, password: str, db: AsyncSession) -> User:
    normalized = identifier.strip()
    user = await db.scalar(
        select(User).where(
            or_(User.email == normalized.lower(), User.phone == normalized)
        )
    )
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid login credentials")
    if not user.is_active:
        raise HTTPException(403, "This SBP Padel account is disabled")
    return user


async def avatar_for(user_id, db: AsyncSession) -> str | None:
    profile = await db.get(UserProfile, user_id)
    return profile.avatar_data_url if profile else None


async def auth_response(user: User, db: AsyncSession) -> dict:
    return {
        "access_token": create_access_token(user.id, user.role.value, user.token_version),
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
            "avatar_data_url": await avatar_for(user.id, db),
        },
    }


@router.post("/register")
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    await enforce_rate_limit("register", client_ip(request), settings.login_rate_limit_attempts)
    validate_password_policy(payload.password)
    if not payload.email and not payload.phone:
        raise HTTPException(400, "Email or phone is required")
    if payload.email and "@" not in payload.email:
        raise HTTPException(400, "Invalid email address")
    clauses = []
    if payload.email:
        clauses.append(User.email == payload.email.lower())
    if payload.phone:
        clauses.append(User.phone == payload.phone)
    existing = await db.scalar(select(User).where(or_(*clauses)))
    if existing:
        raise HTTPException(409, "An account already exists with these details")
    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower() if payload.email else None,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.player,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await auth_response(user, db)


@router.post("/login")
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    subject = f"{client_ip(request)}|{payload.identifier.strip().lower()}"
    await enforce_rate_limit("login", subject, settings.login_rate_limit_attempts)
    user = await authenticate(payload.identifier, payload.password, db)
    return await auth_response(user, db)


@router.get("/google/config")
async def google_config() -> dict:
    return {
        "enabled": bool(settings.google_client_id),
        "client_id": settings.google_client_id if settings.google_client_id else None,
    }


@router.post("/google")
async def google_login(payload: GoogleLoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    await enforce_rate_limit("google", client_ip(request), settings.login_rate_limit_attempts)
    claims = await verify_google_id_token(payload.credential)
    email = claims["email"]
    user = await db.scalar(select(User).where(User.email == email))
    if user is not None:
        if not user.is_active:
            raise HTTPException(403, "This SBP Padel account is disabled")
        if user.role != UserRole.player:
            raise HTTPException(403, "Google sign-in is available for player accounts only")
        if not user.full_name.strip() and claims.get("name"):
            user.full_name = claims["name"][:150]
            await db.commit()
    else:
        user = User(
            full_name=(claims.get("name") or email.split("@", 1)[0])[:150],
            email=email,
            phone=None,
            password_hash=None,
            role=UserRole.player,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return await auth_response(user, db)


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    subject = f"{client_ip(request)}|{email}"
    await enforce_rate_limit("forgot", subject, settings.reset_rate_limit_attempts)
    user = await db.scalar(select(User).where(User.email == email))
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.password_reset_minutes)
    challenge_payload = {
        "purpose": "password_reset",
        "sub": str(user.id) if user else "missing",
        "email": email,
        "otp_hash": _otp_hash(code),
        "pwd": _password_fingerprint(user.password_hash if user else secrets.token_hex(16)),
        "ver": int(user.token_version) if user else -1,
        "exp": expires,
    }
    challenge = jwt.encode(challenge_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    delivered = False
    if user and user.email:
        delivered = await send_email(
            user.email,
            "SBP Padel password reset code",
            (
                f"Your SBP Padel password reset code is: {code}\n\n"
                f"This code expires in {settings.password_reset_minutes} minutes. "
                "If you did not request this reset, you can ignore this email."
            ),
        )
    return {
        "message": "If that email is registered, a reset code has been sent.",
        "challenge": challenge,
        "expires_in_minutes": settings.password_reset_minutes,
        "delivery": "email" if delivered else ("development-console" if settings.environment == "development" and user else "email"),
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    await enforce_rate_limit("reset", client_ip(request), settings.reset_rate_limit_attempts)
    validate_password_policy(payload.new_password)
    try:
        data = jwt.decode(payload.challenge, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(400, "Reset code has expired or is invalid")
    if data.get("purpose") != "password_reset":
        raise HTTPException(400, "Invalid password reset challenge")
    if not hmac.compare_digest(str(data.get("otp_hash", "")), _otp_hash(payload.otp)):
        raise HTTPException(400, "Incorrect reset code")
    user_id = data.get("sub")
    if not user_id or user_id == "missing":
        raise HTTPException(400, "Incorrect reset code")
    try:
        from uuid import UUID

        user = await db.get(User, UUID(user_id))
    except ValueError:
        user = None
    if not user or user.email != str(data.get("email", "")).lower():
        raise HTTPException(400, "Reset code has expired or is invalid")
    if int(data.get("ver", -1)) != int(user.token_version or 0):
        raise HTTPException(400, "This reset code has already been used")
    if not hmac.compare_digest(str(data.get("pwd", "")), _password_fingerprint(user.password_hash)):
        raise HTTPException(400, "This reset code has already been used")
    user.password_hash = hash_password(payload.new_password)
    user.token_version = int(user.token_version or 0) + 1
    await db.commit()
    return {"message": "Password updated successfully"}


@router.post("/token")
async def token(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    subject = f"{client_ip(request)}|{form.username.strip().lower()}"
    await enforce_rate_limit("token", subject, settings.login_rate_limit_attempts)
    user = await authenticate(form.username, form.password, db)
    return {
        "access_token": create_access_token(user.id, user.role.value, user.token_version),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
        "avatar_data_url": await avatar_for(user.id, db),
    }


@router.put("/me/avatar")
async def update_avatar(
    payload: AvatarRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    value = _validate_image_data_url(payload.avatar_data_url.strip())
    profile = await db.get(UserProfile, user.id)
    if profile is None:
        profile = UserProfile(user_id=user.id, avatar_data_url=value)
        db.add(profile)
    else:
        profile.avatar_data_url = value
    await db.commit()
    return {"avatar_data_url": value}


@router.delete("/me/avatar")
async def delete_avatar(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await db.get(UserProfile, user.id)
    if profile is not None:
        profile.avatar_data_url = None
        await db.commit()
    return {"avatar_data_url": None}
