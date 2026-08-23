import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.operations import ensure_venue_access
from app.core.security import current_user, hash_password
from app.db.session import get_db
from app.models.domain import User, UserRole

router = APIRouter(prefix="/operations", tags=["venue player operations"])


class VenuePlayerCreateRequest(BaseModel):
    venue_id: str
    full_name: str = Field(min_length=2, max_length=150)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, min_length=7, max_length=30)


@router.post("/players")
async def create_player_for_venue(
    payload: VenuePlayerCreateRequest,
    staff: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from uuid import UUID

    try:
        venue_id = UUID(payload.venue_id)
    except ValueError as exc:
        raise HTTPException(400, "Invalid venue") from exc
    await ensure_venue_access(staff, venue_id, db)

    email = payload.email.strip().lower() if payload.email else None
    phone = payload.phone.strip() if payload.phone else None
    if not email and not phone:
        raise HTTPException(400, "Email or phone is required")
    if email and "@" not in email:
        raise HTTPException(400, "Invalid email address")

    clauses = []
    if email:
        clauses.append(User.email == email)
    if phone:
        clauses.append(User.phone == phone)
    existing = await db.scalar(select(User).where(or_(*clauses)))
    if existing:
        if existing.role == UserRole.player:
            raise HTTPException(409, "A player account already exists with this email or phone. Search and select that player instead.")
        raise HTTPException(409, "These contact details are already used by another account")

    temporary_password = f"Padel-{secrets.token_urlsafe(8)}"
    player = User(
        full_name=payload.full_name.strip(),
        email=email,
        phone=phone,
        password_hash=hash_password(temporary_password),
        role=UserRole.player,
        is_active=True,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return {
        "id": str(player.id),
        "full_name": player.full_name,
        "email": player.email,
        "phone": player.phone,
        "temporary_password": temporary_password,
        "message": "Player account created. Share the temporary password with the player securely.",
    }
