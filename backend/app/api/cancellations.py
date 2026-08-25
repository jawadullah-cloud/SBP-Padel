from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.booking_policy import booking_change_context
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import Booking, BookingStatus, Notification, Payment, PaymentStatus, Refund, RefundStatus, User

router = APIRouter(prefix="/bookings", tags=["bookings"])


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


@router.post("/{booking_id}/cancel")
async def cancel_booking(booking_id: UUID, payload: CancelRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    if booking.status not in {BookingStatus.pending_payment, BookingStatus.confirmed, BookingStatus.rescheduled}:
        raise HTTPException(409, f"A {booking.status.value} booking cannot be cancelled")
    policy = await booking_change_context(booking, db)
    if not policy["eligible"]:
        raise HTTPException(409, policy["reason"])

    previous_status = booking.status
    paid_booking = previous_status in {BookingStatus.confirmed, BookingStatus.rescheduled}
    booking.status = BookingStatus.cancelled
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_reason = payload.reason.strip() if payload.reason else None
    refund = None
    if paid_booking:
        payment = await db.scalar(select(Payment).where(Payment.booking_id == booking.id, Payment.status.in_([PaymentStatus.paid, PaymentStatus.partially_refunded])).order_by(Payment.created_at.desc()))
        if payment:
            refund = await db.scalar(select(Refund).where(Refund.booking_id == booking.id, Refund.status.in_([RefundStatus.requested, RefundStatus.processing])))
            if not refund:
                refund = Refund(payment_id=payment.id, booking_id=booking.id, amount=payment.amount, currency=payment.currency, status=RefundStatus.requested, reason=booking.cancellation_reason or "Player cancellation within refund policy")
                db.add(refund)
    db.add(Notification(user_id=user.id, kind="booking_cancelled", title="Booking cancelled", body=f"Booking {booking.booking_code} has been cancelled.", payload={"booking_id": str(booking.id), "booking_code": booking.booking_code, "refund_required": bool(refund), "cutoff_hours": policy["cutoff_hours"]}))
    await db.commit()
    await slot_locks.release_booking(booking.id)
    return {"id": str(booking.id), "booking_code": booking.booking_code, "status": booking.status.value, "slots_released": True, "refund_required": bool(refund), "refund_status": refund.status.value if refund else None, "refund_id": str(refund.id) if refund else None, "hours_before_start": policy["hours_before"], "cutoff_hours": policy["cutoff_hours"]}
