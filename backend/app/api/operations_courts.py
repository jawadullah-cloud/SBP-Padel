from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Court, CourtStatus, User, UserRole
from app.models.operations import UserVenueAssignment, VenueAssignmentRole

router = APIRouter(prefix="/operations", tags=["venue operations"])


class CourtStatusRequest(BaseModel):
    status: CourtStatus


async def ensure_manager(user: User, venue_id: UUID, db: AsyncSession) -> None:
    if user.role == UserRole.admin:
        return
    if user.role != UserRole.venue_manager:
        raise HTTPException(403, "Venue manager permission is required")
    assignment = await db.scalar(
        select(UserVenueAssignment).where(
            UserVenueAssignment.user_id == user.id,
            UserVenueAssignment.venue_id == venue_id,
            UserVenueAssignment.role == VenueAssignmentRole.manager,
            UserVenueAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(403, "You are not assigned as manager of this venue")


async def ensure_staff(user: User, venue_id: UUID, db: AsyncSession) -> None:
    if user.role == UserRole.admin:
        return
    assignment = await db.scalar(
        select(UserVenueAssignment).where(
            UserVenueAssignment.user_id == user.id,
            UserVenueAssignment.venue_id == venue_id,
            UserVenueAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(403, "You are not assigned to this venue")


@router.get("/courts")
async def operational_courts(
    venue_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_staff(user, venue_id, db)
    courts = (await db.scalars(select(Court).where(Court.venue_id == venue_id).order_by(Court.code))).all()
    return [{"id": str(c.id), "code": c.code, "name": c.name, "court_type": c.court_type, "status": c.status.value, "capacity": c.capacity, "is_indoor": c.is_indoor} for c in courts]


@router.patch("/courts/{court_id}/status")
async def set_operational_court_status(
    court_id: UUID,
    payload: CourtStatusRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    court = await db.get(Court, court_id)
    if not court:
        raise HTTPException(404, "Court not found")
    await ensure_manager(user, court.venue_id, db)
    court.status = payload.status
    await db.commit()
    return {"id": str(court.id), "status": court.status.value}
