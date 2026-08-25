from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.booking_participants import BookingParticipant
from app.models.domain import Booking, User

router = APIRouter(prefix="/bookings", tags=["booking participants"])


class ParticipantsPayload(BaseModel):
    players: list[str] = Field(default_factory=list, max_length=4)

    @field_validator("players")
    @classmethod
    def clean_players(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for raw in value:
            name = " ".join(str(raw or "").strip().split())
            if not name:
                continue
            if len(name) > 150:
                raise ValueError("Player name is too long")
            if name.casefold() not in {x.casefold() for x in cleaned}:
                cleaned.append(name)
        return cleaned[:4]


async def owned_booking(booking_id: UUID, user: User, db: AsyncSession) -> Booking:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    return booking


@router.put("/{booking_id}/participants")
async def replace_participants(
    booking_id: UUID,
    payload: ParticipantsPayload,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await owned_booking(booking_id, user, db)
    owner = " ".join(user.full_name.strip().split())
    extras = [name for name in payload.players if name.casefold() != owner.casefold()]
    names = [owner, *extras][:4]
    await db.execute(delete(BookingParticipant).where(BookingParticipant.booking_id == booking_id))
    for position, name in enumerate(names, start=1):
        db.add(BookingParticipant(booking_id=booking_id, position=position, name=name))
    await db.commit()
    return {"booking_id": str(booking_id), "players": names, "player_count": len(names)}


@router.get("/{booking_id}/participants")
async def get_participants(
    booking_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await owned_booking(booking_id, user, db)
    rows = (
        await db.scalars(
            select(BookingParticipant)
            .where(BookingParticipant.booking_id == booking_id)
            .order_by(BookingParticipant.position)
        )
    ).all()
    names = [row.name for row in rows] or [user.full_name]
    return {"booking_id": str(booking_id), "players": names, "player_count": len(names)}
