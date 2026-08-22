from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, BookingStatus, Notification, User

router = APIRouter(prefix="/bookings", tags=["bookings"])


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: UUID,
    payload: CancelRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    if booking.status not in {BookingStatus.pending_payment, BookingStatus.confirmed}:
        raise HTTPException(409, f"A {booking.status.value} booking cannot be cancelled")

    previous_status = booking.status
    booking.status = BookingStatus.cancelled
    booking.cancelled_at = datetime.now(timezone.utc)
    booking.cancellation_reason = payload.reason.strip() if payload.reason else None
    db.add(
        Notification(
            user_id=user.id,
            kind="booking_cancelled",
            title="Booking cancelled",
            body=f"Booking {booking.booking_code} has been cancelled.",
            payload={
                "booking_id": str(booking.id),
                "booking_code": booking.booking_code,
                "refund_required": previous_status == BookingStatus.confirmed,
            },
        )
    )
    await db.commit()

    return {
        "id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": booking.status.value,
        "slots_released": True,
        "refund_required": previous_status == BookingStatus.confirmed,
        "refund_status": (
            "awaiting_payment_provider"
            if previous_status == BookingStatus.confirmed
            else None
        ),
    }
