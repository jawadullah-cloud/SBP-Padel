from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import current_user
from app.db.session import get_db
from app.models.domain import Booking, Payment, Refund, User

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/me")
async def my_payment_history(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    rows = (
        await db.execute(
            select(Payment, Booking)
            .join(Booking, Booking.id == Payment.booking_id)
            .where(Booking.user_id == user.id)
            .order_by(Payment.created_at.desc())
        )
    ).all()
    result: list[dict] = []
    for payment, booking in rows:
        refund = await db.scalar(
            select(Refund)
            .where(Refund.payment_id == payment.id)
            .order_by(Refund.created_at.desc())
        )
        result.append(
            {
                "id": str(payment.id),
                "booking_id": str(booking.id),
                "booking_code": booking.booking_code,
                "booking_date": booking.booking_date.isoformat(),
                "payment_status": payment.status.value,
                "method": payment.method,
                "provider": payment.provider,
                "provider_reference": payment.provider_reference,
                "amount": f"{payment.amount:.2f}",
                "currency": payment.currency,
                "created_at": payment.created_at.isoformat(),
                "refund": None
                if not refund
                else {
                    "id": str(refund.id),
                    "status": refund.status.value,
                    "amount": f"{refund.amount:.2f}",
                    "currency": refund.currency,
                    "provider_reference": refund.provider_reference,
                    "reason": refund.reason,
                    "created_at": refund.created_at.isoformat(),
                },
            }
        )
    return result


@router.get("/by-booking/{booking_id}")
async def payment_for_booking(
    booking_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    payment = await db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking.id)
        .order_by(Payment.created_at.desc())
    )
    if not payment:
        raise HTTPException(404, "Payment not found for this booking")
    return {
        "id": str(payment.id),
        "booking_id": str(payment.booking_id),
        "status": payment.status.value,
        "method": payment.method,
        "provider": payment.provider,
        "provider_reference": payment.provider_reference,
        "amount": f"{payment.amount:.2f}",
        "currency": payment.currency,
    }
