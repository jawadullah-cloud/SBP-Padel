from datetime import date, time
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.bookings import QuoteRequest, SlotRequest, quote_payload
from app.api.operations import ensure_venue_access
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Notification, User

router = APIRouter(prefix="/operations", tags=["venue operations rescheduling"])


class StaffRescheduleRequest(BaseModel):
    court_id: UUID
    booking_date: date
    slots: list[time] = Field(min_length=1, max_length=8)
    reason: str = Field(min_length=3, max_length=500)


@router.post("/bookings/{booking_id}/reschedule")
async def staff_reschedule_booking(
    booking_id: UUID,
    payload: StaffRescheduleRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    await ensure_venue_access(user, booking.venue_id, db, manager_only=True)
    if booking.status not in {BookingStatus.confirmed, BookingStatus.rescheduled}:
        raise HTTPException(409, f"A {booking.status.value} booking cannot be rescheduled")

    request = QuoteRequest(
        venue_id=booking.venue_id,
        court_id=payload.court_id,
        booking_date=payload.booking_date,
        slots=[SlotRequest(start_time=value) for value in payload.slots],
    )
    _, court, slots, new_court_fee = await quote_payload(request, db)
    new_total = new_court_fee + booking.service_fee
    if Decimal(new_total) != Decimal(booking.total_amount):
        raise HTTPException(
            409,
            "The replacement session has a different price. Choose slots with the same total, or cancel/refund and create a new booking.",
        )

    lock = await slot_locks.acquire(court.id, payload.booking_date, [slot["start_time"] for slot in slots])
    if not lock.acquired:
        raise HTTPException(409, "One or more selected slots are being reserved by another booking")

    previous_date = booking.booking_date
    previous_court_id = booking.court_id
    old_slots = (
        await db.scalars(
            select(BookingSlot).where(BookingSlot.booking_id == booking.id).order_by(BookingSlot.start_time)
        )
    ).all()
    previous_times = [slot.start_time.isoformat(timespec="minutes") for slot in old_slots]
    try:
        for old in old_slots:
            await db.delete(old)
        booking.court_id = court.id
        booking.booking_date = payload.booking_date
        booking.status = BookingStatus.rescheduled
        booking.court_fee = new_court_fee
        booking.total_amount = new_total
        for slot in slots:
            db.add(
                BookingSlot(
                    booking_id=booking.id,
                    court_id=court.id,
                    booking_date=payload.booking_date,
                    start_time=slot["start_time"],
                    end_time=slot["end_time"],
                    rate_snapshot=slot["rate"],
                )
            )
        db.add(
            Notification(
                user_id=booking.user_id,
                kind="booking_rescheduled",
                title="Booking rescheduled by venue",
                body=f"Venue staff moved booking {booking.booking_code} to {payload.booking_date.isoformat()}.",
                payload={
                    "booking_id": str(booking.id),
                    "booking_code": booking.booking_code,
                    "previous_date": previous_date.isoformat(),
                    "previous_court_id": str(previous_court_id),
                    "previous_slots": previous_times,
                    "new_date": payload.booking_date.isoformat(),
                    "new_court_id": str(court.id),
                    "new_slots": [slot["start_time"].isoformat(timespec="minutes") for slot in slots],
                    "reason": payload.reason.strip(),
                    "source": "venue_staff",
                    "changed_by_user_id": str(user.id),
                },
            )
        )
        await db.commit()
    except Exception:
        await db.rollback()
        await slot_locks.release_result(lock)
        raise

    await slot_locks.release_result(lock)
    return {
        "id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": booking.status.value,
        "date": booking.booking_date.isoformat(),
        "court_id": str(booking.court_id),
        "court_name": court.name,
        "slots": [slot["start_time"].isoformat(timespec="minutes") for slot in slots],
        "total": f"{booking.total_amount:.2f}",
        "currency": booking.currency,
        "reason": payload.reason.strip(),
    }
