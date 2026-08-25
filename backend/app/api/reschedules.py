from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.bookings import QuoteRequest, SlotRequest, quote_payload
from app.core.booking_policy import booking_change_context
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Notification, User

router = APIRouter(prefix="/bookings", tags=["bookings"])

class RescheduleRequest(BaseModel):
    booking_date: date
    slots: list[SlotRequest] = Field(min_length=1, max_length=8)

@router.post("/{booking_id}/reschedule")
async def reschedule_booking(booking_id: UUID, payload: RescheduleRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id: raise HTTPException(404, "Booking not found")
    if booking.status not in {BookingStatus.confirmed, BookingStatus.rescheduled}: raise HTTPException(409, f"A {booking.status.value} booking cannot be rescheduled")
    policy = await booking_change_context(booking, db)
    if not policy["eligible"]: raise HTTPException(409, policy["reason"])
    request = QuoteRequest(venue_id=booking.venue_id, court_id=booking.court_id, booking_date=payload.booking_date, slots=payload.slots)
    _, court, slots, court_fee = await quote_payload(request, db)
    new_total = court_fee + booking.service_fee
    if Decimal(new_total) != Decimal(booking.total_amount): raise HTTPException(409, "The new slot has a different price. Price-adjusted rescheduling is not available yet.")
    lock = await slot_locks.acquire(court.id, payload.booking_date, [slot["start_time"] for slot in slots])
    if not lock.acquired: raise HTTPException(409, "One or more selected slots are being reserved by another player")
    previous_date = booking.booking_date
    old_slots = (await db.scalars(select(BookingSlot).where(BookingSlot.booking_id == booking.id).order_by(BookingSlot.start_time))).all()
    previous_times = [slot.start_time.isoformat(timespec="minutes") for slot in old_slots]
    try:
        for old in old_slots: await db.delete(old)
        booking.booking_date = payload.booking_date; booking.status = BookingStatus.rescheduled; booking.court_fee = court_fee; booking.total_amount = new_total
        for slot in slots: db.add(BookingSlot(booking_id=booking.id,court_id=court.id,booking_date=payload.booking_date,start_time=slot["start_time"],end_time=slot["end_time"],rate_snapshot=slot["rate"]))
        db.add(Notification(user_id=user.id,kind="booking_rescheduled",title="Booking rescheduled",body=f"Booking {booking.booking_code} has been moved to {payload.booking_date.isoformat()}.",payload={"booking_id":str(booking.id),"booking_code":booking.booking_code,"previous_date":previous_date.isoformat(),"previous_slots":previous_times,"new_date":payload.booking_date.isoformat(),"new_slots":[slot["start_time"].isoformat(timespec="minutes") for slot in slots],"cutoff_hours":policy["cutoff_hours"]}))
        await db.commit()
    except Exception:
        await db.rollback(); await slot_locks.release_result(lock); raise
    await slot_locks.release_result(lock)
    return {"id":str(booking.id),"booking_code":booking.booking_code,"status":booking.status.value,"date":booking.booking_date.isoformat(),"court_id":str(booking.court_id),"slots":[{"start_time":s["start_time"].isoformat(timespec="minutes"),"end_time":s["end_time"].isoformat(timespec="minutes"),"rate":f"{s['rate']:.2f}"} for s in slots],"total":f"{booking.total_amount:.2f}","currency":booking.currency,"cutoff_hours":policy["cutoff_hours"]}
