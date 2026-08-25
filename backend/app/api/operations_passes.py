from datetime import timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.bookings import venue_now
from app.api.operations import ensure_venue_access
from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Court, Payment, PaymentStatus, User, Venue
from app.models.operations import BookingCheckIn

router = APIRouter(prefix="/operations/pass", tags=["venue pass validation"])


class PassValidationRequest(BaseModel):
    venue_id: UUID
    pass_value: str = Field(min_length=3, max_length=300)


def parse_pass_value(value: str) -> tuple[UUID | None, str | None]:
    raw = value.strip()
    if raw.upper().startswith("SBPPADEL|"):
        parts = raw.split("|", 2)
        if len(parts) == 3:
            try:
                return UUID(parts[1]), parts[2].strip() or None
            except ValueError:
                return None, parts[2].strip() or None
    try:
        return UUID(raw), None
    except ValueError:
        return None, raw


async def find_booking(value: str, db: AsyncSession) -> Booking | None:
    booking_id, booking_code = parse_pass_value(value)
    if booking_id:
        booking = await db.get(Booking, booking_id)
        if booking:
            return booking
    if booking_code:
        return await db.scalar(select(Booking).where(Booking.booking_code == booking_code.strip()))
    return None


@router.post("/validate")
async def validate_pass(
    payload: PassValidationRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, payload.venue_id, db)
    booking = await find_booking(payload.pass_value, db)
    if not booking:
        return {"valid": False, "can_check_in": False, "reason": "Booking not found", "reason_code": "not_found"}
    if booking.venue_id != payload.venue_id:
        return {
            "valid": False,
            "can_check_in": False,
            "reason": "This pass belongs to a different venue",
            "reason_code": "wrong_venue",
        }

    venue = await db.get(Venue, booking.venue_id)
    court = await db.get(Court, booking.court_id)
    player = await db.get(User, booking.user_id)
    payment = await db.scalar(
        select(Payment).where(Payment.booking_id == booking.id).order_by(Payment.created_at.desc())
    )
    slots = (
        await db.scalars(
            select(BookingSlot)
            .where(BookingSlot.booking_id == booking.id)
            .order_by(BookingSlot.start_time)
        )
    ).all()
    checkin = await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id == booking.id))

    local_today = venue_now(venue).date() if venue else booking.booking_date
    valid = True
    reason = "Pass is valid for check-in"
    reason_code = "valid"

    if booking.status != BookingStatus.confirmed:
        valid = False
        reason = f"Booking is {booking.status.value.replace('_', ' ')}"
        reason_code = "booking_status"
    elif not payment or payment.status != PaymentStatus.paid:
        valid = False
        reason = "Booking does not have a completed payment"
        reason_code = "payment_status"
    elif booking.booking_date != local_today:
        valid = False
        if booking.booking_date > local_today:
            reason = "This booking is for a future date"
            reason_code = "future_date"
        else:
            reason = "This booking date has passed"
            reason_code = "past_date"
    elif checkin:
        reason = "Player is already checked in for this booking"
        reason_code = "already_checked_in"

    can_check_in = valid and checkin is None
    slot_rows = [
        {
            "start_time": slot.start_time.isoformat(timespec="minutes"),
            "end_time": slot.end_time.isoformat(timespec="minutes"),
        }
        for slot in slots
    ]
    return {
        "valid": valid,
        "can_check_in": can_check_in,
        "reason": reason,
        "reason_code": reason_code,
        "booking": {
            "id": str(booking.id),
            "booking_code": booking.booking_code,
            "date": booking.booking_date.isoformat(),
            "status": booking.status.value,
            "venue_id": str(booking.venue_id),
            "venue_name": venue.name if venue else "Venue",
            "court_id": str(booking.court_id),
            "court_code": court.code if court else None,
            "court_name": court.name if court else "Court",
            "player": {
                "id": str(player.id) if player else None,
                "full_name": player.full_name if player else "Unknown player",
                "email": player.email if player else None,
                "phone": player.phone if player else None,
            },
            "slots": slot_rows,
            "slot_count": len(slot_rows),
            "duration_hours": len(slot_rows),
            "payment_status": payment.status.value if payment else None,
            "payment_method": payment.method if payment else None,
            "checked_in": checkin is not None,
            "checked_in_at": checkin.checked_in_at.astimezone(timezone.utc).isoformat() if checkin else None,
        },
    }
