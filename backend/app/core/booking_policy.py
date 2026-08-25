from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Booking, BookingSlot, Venue
from app.models.operations import BookingCheckIn

CHANGE_CUTOFF_HOURS = 12


async def booking_change_context(booking: Booking, db: AsyncSession) -> dict:
    slots = (await db.scalars(select(BookingSlot).where(BookingSlot.booking_id == booking.id).order_by(BookingSlot.start_time))).all()
    venue = await db.get(Venue, booking.venue_id)
    checkin = await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id == booking.id))
    if not slots:
        return {"eligible": False, "reason": "Booking has no playable slots", "hours_before": None, "started": True, "checked_in": bool(checkin), "first_start": None}
    tz = ZoneInfo(venue.timezone if venue else "Asia/Karachi")
    first_start = datetime.combine(booking.booking_date, slots[0].start_time, tzinfo=tz)
    now = datetime.now(timezone.utc).astimezone(tz)
    hours_before = (first_start - now).total_seconds() / 3600
    started = hours_before <= 0
    if checkin:
        reason = "Booking has already been checked in"
    elif started:
        reason = "Booking session has already started"
    elif hours_before < CHANGE_CUTOFF_HOURS:
        reason = f"Changes close {CHANGE_CUTOFF_HOURS} hours before the first booked slot"
    else:
        reason = None
    return {
        "eligible": reason is None,
        "reason": reason,
        "hours_before": round(hours_before, 2),
        "started": started,
        "checked_in": bool(checkin),
        "checked_in_at": checkin.checked_in_at.isoformat() if checkin else None,
        "first_start": first_start.isoformat(),
        "slots": slots,
        "cutoff_hours": CHANGE_CUTOFF_HOURS,
    }
