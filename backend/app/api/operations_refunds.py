from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.operations import ensure_venue_access
from app.core.booking_policy import booking_change_context
from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, Court, Payment, Refund, User, Venue
from app.models.operations import BookingCheckIn

router = APIRouter(prefix="/operations", tags=["venue refund management"])


@router.get("/refunds-detailed")
async def detailed_venue_refunds(
    venue_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_venue_access(user, venue_id, db, manager_only=True)
    refunds = (
        await db.scalars(
            select(Refund)
            .join(Booking, Booking.id == Refund.booking_id)
            .where(Booking.venue_id == venue_id)
            .order_by(Refund.created_at.desc())
            .limit(500)
        )
    ).all()
    out: list[dict] = []
    for refund in refunds:
        booking = await db.get(Booking, refund.booking_id)
        payment = await db.get(Payment, refund.payment_id)
        if not booking:
            continue
        player = await db.get(User, booking.user_id)
        venue = await db.get(Venue, booking.venue_id)
        court = await db.get(Court, booking.court_id)
        slots = (
            await db.scalars(
                select(BookingSlot)
                .where(BookingSlot.booking_id == booking.id)
                .order_by(BookingSlot.start_time)
            )
        ).all()
        checkin = await db.scalar(select(BookingCheckIn).where(BookingCheckIn.booking_id == booking.id))
        policy = await booking_change_context(booking, db)
        out.append(
            {
                "id": str(refund.id),
                "status": refund.status.value,
                "amount": f"{refund.amount:.2f}",
                "currency": refund.currency,
                "reason": refund.reason,
                "provider_reference": refund.provider_reference,
                "requested_at": refund.created_at.isoformat(),
                "booking": {
                    "id": str(booking.id),
                    "booking_code": booking.booking_code,
                    "date": booking.booking_date.isoformat(),
                    "status": booking.status.value,
                    "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
                    "cancellation_reason": booking.cancellation_reason,
                    "slots": [
                        {
                            "start": slot.start_time.isoformat(timespec="minutes"),
                            "end": slot.end_time.isoformat(timespec="minutes"),
                        }
                        for slot in slots
                    ],
                    "venue": venue.name if venue else None,
                    "city": venue.city if venue else None,
                    "court": court.name if court else None,
                    "player_name": player.full_name if player else None,
                    "player_email": player.email if player else None,
                    "player_phone": player.phone if player else None,
                    "checked_in": bool(checkin),
                    "checked_in_at": checkin.checked_in_at.isoformat() if checkin else None,
                    "first_start": policy.get("first_start"),
                    "hours_before_start": policy.get("hours_before"),
                    "cutoff_hours": policy.get("cutoff_hours"),
                },
                "payment": {
                    "method": payment.method if payment else None,
                    "provider": payment.provider if payment else None,
                    "reference": payment.provider_reference if payment else None,
                    "amount": f"{payment.amount:.2f}" if payment else None,
                    "status": payment.status.value if payment else None,
                },
            }
        )
    return out
