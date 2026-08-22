from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, current_user, hash_password, verify_password
from app.db.session import get_db
from app.models.domain import User, UserRole

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    identifier: str
    password: str


async def authenticate(identifier: str, password: str, db: AsyncSession) -> User:
    normalized = identifier.strip()
    user = await db.scalar(
        select(User).where(
            or_(User.email == normalized.lower(), User.phone == normalized)
        )
    )
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(401, "Invalid login credentials")
    return user


@router.post("/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> dict:
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
    return {
        "access_token": create_access_token(user.id, user.role.value),
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
        },
    }


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> dict:
    user = await authenticate(payload.identifier, payload.password, db)
    return {
        "access_token": create_access_token(user.id, user.role.value),
        "token_type": "bearer",
        "user": {"id": str(user.id), "full_name": user.full_name, "role": user.role.value},
    }


@router.post("/token")
async def token(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await authenticate(form.username, form.password, db)
    return {
        "access_token": create_access_token(user.id, user.role.value),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(user: User = Depends(current_user)) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value,
    }
