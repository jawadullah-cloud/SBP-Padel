from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Court, Payment, User, UserRole, Venue
from app.models.operations import BookingCheckIn, BlockType, UserVenueAssignment, VenueAssignmentRole, VenueBlock

router = APIRouter(prefix="/operations", tags=["venue operations"])
OPERATIONS_ROLES = {UserRole.admin, UserRole.venue_manager, UserRole.venue_operator}
ACTIVE_CHECKIN_STATUSES = {BookingStatus.confirmed, BookingStatus.rescheduled}


class BlockRequest(BaseModel):
    venue_id: UUID
    court_id: UUID | None = None
    block_date: date
    start_time: time
    end_time: time
    block_type: BlockType
    reason: str = Field(min_length=3, max_length=500)


class CheckInRequest(BaseModel):
    note: str | None = Field(default=None, max_length=300)


async def ensure_venue_access(user: User, venue_id: UUID, db: AsyncSession, manager_only: bool = False) -> None:
    if user.role == UserRole.admin:
        return
    if user.role not in OPERATIONS_ROLES:
        raise HTTPException(403, "Insufficient permissions")
    assignment = await db.scalar(
        select(UserVenueAssignment).where(
            UserVenueAssignment.user_id == user.id,
            UserVenueAssignment.venue_id == venue_id,
            UserVenueAssignment.is_active.is_(True),
        )
    )
    if not assignment:
        raise HTTPException(403, "You are not assigned to this venue")
    if manager_only and assignment.role != VenueAssignmentRole.manager:
        raise HTTPException(403, "Venue manager permission is required")


@router.get("/my-venues")
async def my_operational_venues(
    user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
) -> list[dict]:
    if user.role == UserRole.admin:
        venues = (await db.scalars(select(Venue).order_by(Venue.city, Venue.name))).all()
        return [{"id": str(v.id), "name": v.name, "city": v.city, "role": "admin"} for v in venues]
    if user.role not in OPERATIONS_ROLES:
        raise HTTPException(403, "Insufficient permissions")
    rows = (
        await db.execute(
            select(UserVenueAssignment, Venue)
            .join(Venue, Venue.id == UserVenueAssignment.venue_id)
            .where(UserVenueAssignment.user_id == user.id, UserVenueAssignment.is_active.is_(True))
            .order_by(Venue.city, Venue.name)
        )
    ).all()
    return [{"id": str(v.id), "name": v.name, "city": v.city, "role": a.role.value} for a, v in rows]


@router.get("/bookings")
async def operational_bookings(
    venue_id: UUID,
    booking_date: date | None = Query(default=None),
    q: str | None = Query(default=None),
    status: BookingStatus | None = Query(default=None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_venue_access(user, venue_id, db)
    stmt = select(Booking).join(User, User.id == Booking.user_id).where(Booking.venue_id == venue_id)
    if booking_date:
        stmt = stmt.where(Booking.booking_date == booking_date)
    if status:
        stmt = stmt.where(Booking.status == status)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Booking.booking_code.ilike(needle),
                User.full_name.ilike(needle),
                User.email.ilike(needle),
                User.phone.ilike(needle),
            )
        )
    # General Bookings is an activity/history view: newest booking created first.
    # Court Schedule remains the chronological session view.
    bookings = (await db.scalars(stmt.order_by(Booking.created_at.desc(), Booking.booking_date.desc()).limit(200))).all()
    result = []
    for booking in bookings:
        slots = (
            await db.scalars(
                select(BookingSlot).where(BookingSlot.booking_id == booking.id).order_by(BookingSlot.start_time)
            )
        ).all()
        checkin = await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id == booking.id))
        player = await db.get(User, booking.user_id)
        court = await db.get(Court, booking.court_id)
        payment = await db.scalar(
            select(Payment).where(Payment.booking_id == booking.id).order_by(Payment.created_at.desc())
        )
        result.append({
            "id": str(booking.id),
            "booking_code": booking.booking_code,
            "date": booking.booking_date.isoformat(),
            "status": booking.status.value,
            "court_id": str(booking.court_id),
            "court_code": court.code if court else None,
            "court_name": court.name if court else "Court",
            "court_type": court.court_type if court else None,
            "player": {
                "id": str(player.id) if player else None,
                "full_name": player.full_name if player else "Unknown player",
                "email": player.email if player else None,
                "phone": player.phone if player else None,
            },
            "slots": [f"{s.start_time.isoformat(timespec='minutes')}-{s.end_time.isoformat(timespec='minutes')}" for s in slots],
            "total": f"{booking.total_amount:.2f}",
            "currency": booking.currency,
            "payment_status": payment.status.value if payment else None,
            "payment_method": payment.method if payment else None,
            "payment_reference": payment.provider_reference if payment else None,
            "checked_in": checkin is not None,
            "checked_in_at": checkin.checked_in_at.isoformat() if checkin else None,
        })
    return result


@router.post("/bookings/{booking_id}/check-in")
async def check_in_booking(
    booking_id: UUID,
    payload: CheckInRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    await ensure_venue_access(user, booking.venue_id, db)
    if booking.status not in ACTIVE_CHECKIN_STATUSES:
        raise HTTPException(409, "Only confirmed or rescheduled bookings can be checked in")
    existing = await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id == booking.id))
    if existing:
        return {"booking_id": str(booking.id), "checked_in": True, "checked_in_at": existing.checked_in_at.isoformat()}
    row = BookingCheckIn(
        booking_id=booking.id,
        venue_id=booking.venue_id,
        checked_in_at=datetime.now(timezone.utc),
        checked_in_by_user_id=user.id,
        note=payload.note.strip() if payload.note else None,
    )
    db.add(row)
    await db.commit()
    return {"booking_id": str(booking.id), "checked_in": True, "checked_in_at": row.checked_in_at.isoformat()}


@router.get("/blocks")
async def list_blocks(
    venue_id: UUID,
    block_date: date | None = Query(default=None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_venue_access(user, venue_id, db)
    stmt = select(VenueBlock).where(VenueBlock.venue_id == venue_id, VenueBlock.is_active.is_(True))
    if block_date:
        stmt = stmt.where(VenueBlock.block_date == block_date)
    rows = (await db.scalars(stmt.order_by(VenueBlock.block_date.desc(), VenueBlock.start_time))).all()
    return [{
        "id": str(r.id), "venue_id": str(r.venue_id), "court_id": str(r.court_id) if r.court_id else None,
        "date": r.block_date.isoformat(), "start_time": r.start_time.isoformat(timespec="minutes"),
        "end_time": r.end_time.isoformat(timespec="minutes"), "type": r.block_type.value,
        "reason": r.reason, "is_active": r.is_active,
    } for r in rows]


@router.post("/blocks")
async def create_block(
    payload: BlockRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, payload.venue_id, db, manager_only=True)
    venue = await db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "End time must be after start time")
    if payload.court_id:
        court = await db.get(Court, payload.court_id)
        if not court or court.venue_id != payload.venue_id:
            raise HTTPException(400, "Court does not belong to the selected venue")
    row = VenueBlock(
        venue_id=payload.venue_id,
        court_id=payload.court_id,
        block_date=payload.block_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        block_type=payload.block_type,
        reason=payload.reason.strip(),
        created_by_user_id=user.id,
        is_active=True,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "is_active": True}


@router.delete("/blocks/{block_id}")
async def deactivate_block(
    block_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    row = await db.get(VenueBlock, block_id)
    if not row:
        raise HTTPException(404, "Block not found")
    await ensure_venue_access(user, row.venue_id, db, manager_only=True)
    row.is_active = False
    await db.commit()
    return {"id": str(row.id), "is_active": False}
