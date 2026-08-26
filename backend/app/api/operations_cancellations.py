from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.operations import ensure_venue_access
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import (
    Booking,
    BookingStatus,
    Notification,
    Payment,
    PaymentStatus,
    Refund,
    RefundStatus,
    User,
)

router = APIRouter(prefix="/operations", tags=["venue operations cancellations"])
ACTIVE_CANCELLABLE = {BookingStatus.pending_payment, BookingStatus.confirmed, BookingStatus.rescheduled}


class OperationsCancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


@router.post("/bookings/{booking_id}/cancel")
async def cancel_operational_booking(
    booking_id: UUID,
    payload: OperationsCancelRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    await ensure_venue_access(user, booking.venue_id, db, manager_only=True)
    if booking.status not in ACTIVE_CANCELLABLE:
        raise HTTPException(409, f"A {booking.status.value} booking cannot be cancelled")

    reason = payload.reason.strip()
    paid = booking.status in {BookingStatus.confirmed, BookingStatus.rescheduled}
    booking.status = BookingStatus.venue_cancelled
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_reason = reason

    refund = None
    created_refund = False
    if paid:
        payment = await db.scalar(
            select(Payment)
            .where(
                Payment.booking_id == booking.id,
                Payment.status.in_([PaymentStatus.paid, PaymentStatus.partially_refunded]),
            )
            .order_by(Payment.created_at.desc())
        )
        if payment:
            refund = await db.scalar(
                select(Refund).where(
                    Refund.booking_id == booking.id,
                    Refund.status.in_([RefundStatus.requested, RefundStatus.processing, RefundStatus.completed]),
                )
            )
            if not refund:
                refund = Refund(
                    payment_id=payment.id,
                    booking_id=booking.id,
                    amount=payment.amount,
                    currency=payment.currency,
                    status=RefundStatus.requested,
                    reason=f"Venue cancellation: {reason}",
                )
                db.add(refund)
                await db.flush()
                created_refund = True

    db.add(
        Notification(
            user_id=booking.user_id,
            kind="venue_booking_cancelled",
            title="Booking cancelled by venue",
            body=f"Venue staff cancelled booking {booking.booking_code}. {reason}",
            payload={
                "booking_id": str(booking.id),
                "booking_code": booking.booking_code,
                "refund_required": bool(refund),
                "source": "venue_operations",
            },
        )
    )
    if created_refund:
        db.add(
            Notification(
                user_id=booking.user_id,
                kind="refund_requested",
                title="Refund requested",
                body=f"Refund processing has started for booking {booking.booking_code}.",
                payload={"booking_id": str(booking.id), "refund_id": str(refund.id)},
            )
        )

    await db.commit()
    await slot_locks.release_booking(booking.id)
    return {
        "id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": booking.status.value,
        "slots_released": True,
        "refund_required": bool(refund),
        "refund_status": refund.status.value if refund else None,
        "refund_id": str(refund.id) if refund else None,
    }
