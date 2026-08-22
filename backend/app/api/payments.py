from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import current_user
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

router = APIRouter(prefix="/payments", tags=["payments"])


class InitiatePaymentRequest(BaseModel):
    booking_id: UUID
    method: str = Field(min_length=2, max_length=80)


class RefundRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


def _hold_expired(booking: Booking) -> bool:
    created = booking.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created < datetime.now(timezone.utc) - timedelta(minutes=settings.slot_hold_minutes)


async def _owned_booking(booking_id: UUID, user: User, db: AsyncSession) -> Booking:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    return booking


@router.post("/initiate")
async def initiate_payment(
    payload: InitiatePaymentRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    booking = await _owned_booking(payload.booking_id, user, db)
    if booking.status != BookingStatus.pending_payment:
        raise HTTPException(409, "Booking is not awaiting payment")
    if _hold_expired(booking):
        booking.status = BookingStatus.expired
        await db.commit()
        raise HTTPException(409, "Booking hold has expired. Please select the slots again.")

    existing = await db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking.id, Payment.status == PaymentStatus.pending)
        .order_by(Payment.created_at.desc())
    )
    if existing:
        payment = existing
    else:
        payment = Payment(
            booking_id=booking.id,
            provider="unconfigured",
            provider_reference=f"PAY-{uuid4().hex[:16].upper()}",
            method=payload.method,
            amount=booking.total_amount,
            currency=booking.currency,
            status=PaymentStatus.pending,
            provider_metadata={"stage": "provider_selection_pending"},
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)

    return {
        "payment_id": str(payment.id),
        "booking_id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": payment.status.value,
        "amount": f"{payment.amount:.2f}",
        "currency": payment.currency,
        "method": payment.method,
        "provider": payment.provider,
        "provider_reference": payment.provider_reference,
        "requires_provider_integration": payment.provider == "unconfigured",
    }


@router.get("/{payment_id}")
async def payment_detail(
    payment_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    booking = await _owned_booking(payment.booking_id, user, db)
    return {
        "id": str(payment.id),
        "booking_id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": payment.status.value,
        "method": payment.method,
        "provider": payment.provider,
        "provider_reference": payment.provider_reference,
        "amount": f"{payment.amount:.2f}",
        "currency": payment.currency,
    }


@router.post("/{payment_id}/simulate-success", include_in_schema=False)
async def simulate_success(
    payment_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if settings.environment != "development":
        raise HTTPException(404, "Not found")
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    booking = await _owned_booking(payment.booking_id, user, db)
    if payment.status == PaymentStatus.paid and booking.status == BookingStatus.confirmed:
        return {"payment_status": "paid", "booking_status": "confirmed"}
    if booking.status != BookingStatus.pending_payment or _hold_expired(booking):
        booking.status = BookingStatus.expired
        payment.status = PaymentStatus.failed
        await db.commit()
        raise HTTPException(409, "Booking hold expired before payment confirmation")

    payment.status = PaymentStatus.paid
    payment.provider = "development-simulator"
    payment.provider_metadata = {"simulated": True, "confirmed_at": datetime.now(timezone.utc).isoformat()}
    booking.status = BookingStatus.confirmed
    db.add(
        Notification(
            user_id=user.id,
            kind="booking_confirmed",
            title="Booking confirmed",
            body=f"Your booking {booking.booking_code} has been confirmed.",
            payload={"booking_id": str(booking.id), "booking_code": booking.booking_code},
        )
    )
    await db.commit()
    return {
        "payment_status": payment.status.value,
        "booking_status": booking.status.value,
        "booking_id": str(booking.id),
        "booking_code": booking.booking_code,
    }


@router.post("/{payment_id}/simulate-failure", include_in_schema=False)
async def simulate_failure(
    payment_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if settings.environment != "development":
        raise HTTPException(404, "Not found")
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    booking = await _owned_booking(payment.booking_id, user, db)
    if payment.status == PaymentStatus.paid:
        raise HTTPException(409, "Paid payment cannot be marked failed")
    payment.status = PaymentStatus.failed
    booking.status = BookingStatus.payment_failed
    await db.commit()
    return {"payment_status": payment.status.value, "booking_status": booking.status.value}


@router.post("/{payment_id}/refund")
async def request_refund(
    payment_id: UUID,
    payload: RefundRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    booking = await _owned_booking(payment.booking_id, user, db)
    if payment.status != PaymentStatus.paid:
        raise HTTPException(409, "Only paid transactions can be refunded")
    if booking.status not in {BookingStatus.cancelled, BookingStatus.venue_cancelled}:
        raise HTTPException(409, "Booking must be cancelled before refund processing")

    existing = await db.scalar(
        select(Refund).where(
            Refund.payment_id == payment.id,
            Refund.status.in_([RefundStatus.requested, RefundStatus.processing, RefundStatus.completed]),
        )
    )
    if existing:
        refund = existing
    else:
        refund = Refund(
            payment_id=payment.id,
            booking_id=booking.id,
            amount=payment.amount,
            currency=payment.currency,
            status=RefundStatus.requested,
            reason=payload.reason,
        )
        db.add(refund)
        db.add(
            Notification(
                user_id=user.id,
                kind="refund_requested",
                title="Refund requested",
                body=f"Refund processing has started for booking {booking.booking_code}.",
                payload={"booking_id": str(booking.id), "refund_id": str(refund.id)},
            )
        )
        await db.commit()
        await db.refresh(refund)

    return {
        "refund_id": str(refund.id),
        "booking_id": str(booking.id),
        "payment_id": str(payment.id),
        "status": refund.status.value,
        "amount": f"{refund.amount:.2f}",
        "currency": refund.currency,
    }
