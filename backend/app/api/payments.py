from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
from app.payments.providers import PaymentCallbackEvent, payment_provider

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


async def _ensure_confirmation_notification(booking: Booking, user: User, db: AsyncSession) -> None:
    existing = await db.scalar(
        select(Notification)
        .where(
            Notification.user_id == user.id,
            Notification.kind == "booking_confirmed",
            Notification.body.contains(booking.booking_code),
        )
        .order_by(Notification.created_at.desc())
    )
    if existing:
        return
    db.add(
        Notification(
            user_id=user.id,
            kind="booking_confirmed",
            title="Booking confirmed",
            body=f"Your booking {booking.booking_code} has been confirmed.",
            payload={"booking_id": str(booking.id), "booking_code": booking.booking_code},
        )
    )


async def _ensure_late_payment_refund(payment: Payment, booking: Booking, db: AsyncSession) -> Refund:
    existing = await db.scalar(
        select(Refund)
        .where(Refund.payment_id == payment.id)
        .order_by(Refund.created_at.desc())
    )
    if existing:
        return existing
    refund = Refund(
        payment_id=payment.id,
        booking_id=booking.id,
        amount=payment.amount,
        currency=payment.currency,
        status=RefundStatus.requested,
        reason="Payment received after booking could no longer be safely confirmed",
    )
    db.add(refund)
    await db.flush()
    player = await db.get(User, booking.user_id)
    if player:
        db.add(
            Notification(
                user_id=player.id,
                kind="payment_reconciliation_required",
                title="Payment received after booking expiry",
                body=f"Payment was received for {booking.booking_code} after the booking could no longer be confirmed. A refund review has been opened.",
                payload={"booking_id": str(booking.id), "payment_id": str(payment.id), "refund_id": str(refund.id)},
            )
        )
    return refund


def _payment_response(payment: Payment, booking: Booking) -> dict:
    metadata = dict(payment.provider_metadata or {})
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
        "redirect_url": metadata.get("redirect_url"),
        "client_payload": metadata.get("client_payload") or {},
        "requires_provider_integration": payment.provider == "unconfigured",
    }


def _record_callback_metadata(payment: Payment, event: PaymentCallbackEvent) -> None:
    metadata = dict(payment.provider_metadata or {})
    metadata["last_callback"] = {
        "status": event.status,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "transaction_reference": event.transaction_reference,
        **dict(event.provider_metadata or {}),
    }
    payment.provider_metadata = metadata


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
        await slot_locks.release_booking(booking.id)
        raise HTTPException(409, "Booking hold has expired. Please select the slots again.")

    existing = await db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking.id, Payment.status == PaymentStatus.pending)
        .order_by(Payment.created_at.desc())
    )
    if existing:
        return _payment_response(existing, booking)

    local_reference = f"PAY-{uuid4().hex[:16].upper()}"
    try:
        initiation = await payment_provider.initiate_payment(
            reference=local_reference,
            amount=booking.total_amount,
            currency=booking.currency,
            method=payload.method,
            return_url=None,
        )
    except Exception as exc:
        raise HTTPException(502, "Payment provider could not initiate the transaction") from exc

    try:
        status = PaymentStatus(initiation.status)
    except ValueError:
        status = PaymentStatus.pending

    provider_metadata = dict(initiation.provider_metadata or {})
    if initiation.redirect_url:
        provider_metadata["redirect_url"] = initiation.redirect_url
    if initiation.client_payload:
        provider_metadata["client_payload"] = initiation.client_payload
    provider_metadata.setdefault("local_reference", local_reference)

    payment = Payment(
        booking_id=booking.id,
        provider=initiation.provider,
        provider_reference=initiation.provider_reference or local_reference,
        method=payload.method,
        amount=booking.total_amount,
        currency=booking.currency,
        status=status,
        provider_metadata=provider_metadata,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return _payment_response(payment, booking)


@router.post("/provider-callback", include_in_schema=False)
async def provider_callback(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    raw_payload = await request.body()
    headers = {key.lower(): value for key, value in request.headers.items()}
    try:
        event = await payment_provider.verify_callback(raw_payload, headers)
    except Exception as exc:
        raise HTTPException(401, "Payment callback verification failed") from exc

    status = event.status.strip().lower()
    if status not in {"pending", "paid", "failed"}:
        raise HTTPException(400, "Unsupported payment callback status")

    payment = await db.scalar(
        select(Payment)
        .where(
            Payment.provider == payment_provider.name,
            Payment.provider_reference == event.provider_reference,
        )
        .order_by(Payment.created_at.desc())
    )
    if not payment:
        raise HTTPException(404, "Payment reference not found")
    booking = await db.get(Booking, payment.booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")

    if event.amount is not None and event.amount != payment.amount:
        raise HTTPException(409, "Payment callback amount does not match the booking")
    if event.currency is not None and event.currency.upper() != payment.currency.upper():
        raise HTTPException(409, "Payment callback currency does not match the booking")

    _record_callback_metadata(payment, event)

    if status == "pending":
        await db.commit()
        return {
            "accepted": True,
            "payment_status": payment.status.value,
            "booking_status": booking.status.value,
            "reconciliation_required": False,
        }

    if status == "failed":
        if payment.status in {PaymentStatus.paid, PaymentStatus.refunded, PaymentStatus.partially_refunded}:
            await db.commit()
            return {
                "accepted": True,
                "payment_status": payment.status.value,
                "booking_status": booking.status.value,
                "reconciliation_required": False,
            }
        payment.status = PaymentStatus.failed
        if booking.status == BookingStatus.pending_payment:
            booking.status = BookingStatus.payment_failed
        await db.commit()
        await slot_locks.release_booking(booking.id)
        return {
            "accepted": True,
            "payment_status": payment.status.value,
            "booking_status": booking.status.value,
            "reconciliation_required": False,
        }

    # Paid callbacks are authoritative only after provider verification above.
    # Never re-open inventory that is no longer safely held for this booking.
    if booking.status in {BookingStatus.confirmed, BookingStatus.rescheduled, BookingStatus.completed}:
        if payment.status not in {PaymentStatus.refunded, PaymentStatus.partially_refunded}:
            payment.status = PaymentStatus.paid
        await db.commit()
        return {
            "accepted": True,
            "payment_status": payment.status.value,
            "booking_status": booking.status.value,
            "reconciliation_required": False,
        }

    if booking.status == BookingStatus.pending_payment and not _hold_expired(booking):
        payment.status = PaymentStatus.paid
        booking.status = BookingStatus.confirmed
        player = await db.get(User, booking.user_id)
        if player:
            await _ensure_confirmation_notification(booking, player, db)
        await db.commit()
        await slot_locks.release_booking(booking.id)
        return {
            "accepted": True,
            "payment_status": payment.status.value,
            "booking_status": booking.status.value,
            "reconciliation_required": False,
        }

    payment.status = PaymentStatus.paid
    if booking.status == BookingStatus.pending_payment:
        booking.status = BookingStatus.expired
    refund = await _ensure_late_payment_refund(payment, booking, db)
    await db.commit()
    await slot_locks.release_booking(booking.id)
    return {
        "accepted": True,
        "payment_status": payment.status.value,
        "booking_status": booking.status.value,
        "reconciliation_required": True,
        "refund_id": str(refund.id),
        "refund_status": refund.status.value,
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
    response = _payment_response(payment, booking)
    response["id"] = response.pop("payment_id")
    return response


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
        await _ensure_confirmation_notification(booking, user, db)
        await db.commit()
        return {"payment_status": "paid", "booking_status": "confirmed", "booking_id": str(booking.id), "booking_code": booking.booking_code}
    if booking.status != BookingStatus.pending_payment or _hold_expired(booking):
        booking.status = BookingStatus.expired
        payment.status = PaymentStatus.failed
        await db.commit()
        await slot_locks.release_booking(booking.id)
        raise HTTPException(409, "Booking hold expired before payment confirmation")

    payment.status = PaymentStatus.paid
    payment.provider = "development-simulator"
    payment.provider_metadata = {"simulated": True, "confirmed_at": datetime.now(timezone.utc).isoformat()}
    booking.status = BookingStatus.confirmed
    await _ensure_confirmation_notification(booking, user, db)
    await db.commit()
    await slot_locks.release_booking(booking.id)
    return {"payment_status": payment.status.value, "booking_status": booking.status.value, "booking_id": str(booking.id), "booking_code": booking.booking_code}


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
    await slot_locks.release_booking(booking.id)
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
        refund = Refund(payment_id=payment.id, booking_id=booking.id, amount=payment.amount, currency=payment.currency, status=RefundStatus.requested, reason=payload.reason)
        db.add(refund)
        await db.flush()
        db.add(Notification(user_id=user.id, kind="refund_requested", title="Refund requested", body=f"Refund processing has started for booking {booking.booking_code}.", payload={"booking_id": str(booking.id), "refund_id": str(refund.id)}))
        await db.commit()
        await db.refresh(refund)

    return {"refund_id": str(refund.id), "booking_id": str(booking.id), "payment_id": str(payment.id), "status": refund.status.value, "amount": f"{refund.amount:.2f}", "currency": refund.currency}
