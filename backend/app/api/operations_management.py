from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.bookings import QuoteRequest, SlotRequest, quote_payload
from app.api.operations import ensure_venue_access
from app.core.config import settings
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import (
    Booking,
    BookingSlot,
    BookingStatus,
    Court,
    Notification,
    Payment,
    PaymentStatus,
    PolicyVersion,
    PricingRule,
    Refund,
    RefundStatus,
    User,
    UserRole,
    Venue,
)
from app.models.operations import BookingCheckIn

router = APIRouter(prefix="/operations", tags=["venue operations management"])


class FrontDeskBookingRequest(BaseModel):
    venue_id: UUID
    player_id: UUID
    court_id: UUID
    booking_date: date
    slots: list[time] = Field(min_length=1, max_length=8)
    payment_method: str = Field(default="cash", min_length=2, max_length=80)
    payment_reference: str | None = Field(default=None, max_length=150)
    policy_acknowledged: bool = False


class VenuePricingRuleRequest(BaseModel):
    venue_id: UUID
    court_id: UUID | None = None
    court_type: str | None = Field(default=None, max_length=80)
    valid_from: date | None = None
    valid_to: date | None = None
    weekdays: list[int] = Field(default_factory=list)
    start_time: time
    end_time: time
    hourly_rate: Decimal = Field(gt=0)
    currency: str = Field(default="PKR", min_length=3, max_length=3)
    priority: int = 0


class VenueRefundUpdateRequest(BaseModel):
    status: RefundStatus
    provider_reference: str | None = Field(default=None, max_length=150)


def _date_bounds(from_date: date, to_date: date) -> None:
    if to_date < from_date:
        raise HTTPException(400, "to_date cannot be before from_date")


@router.get("/players/search")
async def search_players(
    venue_id: UUID,
    q: str = Query(min_length=2, max_length=120),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_venue_access(user, venue_id, db)
    needle = f"%{q.strip()}%"
    rows = (
        await db.scalars(
            select(User)
            .where(
                User.role == UserRole.player,
                User.is_active.is_(True),
                or_(User.full_name.ilike(needle), User.email.ilike(needle), User.phone.ilike(needle)),
            )
            .order_by(User.full_name)
            .limit(20)
        )
    ).all()
    return [
        {
            "id": str(row.id),
            "full_name": row.full_name,
            "email": row.email,
            "phone": row.phone,
        }
        for row in rows
    ]


@router.post("/bookings/front-desk")
async def create_front_desk_booking(
    payload: FrontDeskBookingRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, payload.venue_id, db)
    if not payload.policy_acknowledged:
        raise HTTPException(400, "Confirm that the booking policy has been communicated to the player")

    player = await db.get(User, payload.player_id)
    if not player or player.role != UserRole.player or not player.is_active:
        raise HTTPException(404, "Active player account not found")

    policy = await db.scalar(
        select(PolicyVersion)
        .where(
            PolicyVersion.is_active.is_(True),
            PolicyVersion.effective_from <= datetime.now(timezone.utc),
        )
        .order_by(PolicyVersion.effective_from.desc())
    )
    if not policy:
        raise HTTPException(409, "No active booking policy is published")

    quote_request = QuoteRequest(
        venue_id=payload.venue_id,
        court_id=payload.court_id,
        booking_date=payload.booking_date,
        slots=[SlotRequest(start_time=value) for value in payload.slots],
    )
    venue, court, slots, court_fee = await quote_payload(quote_request, db)
    lock = await slot_locks.acquire(court.id, payload.booking_date, [slot["start_time"] for slot in slots])
    if not lock.acquired:
        raise HTTPException(409, "One or more selected slots are being reserved by another booking")

    service_fee = Decimal(str(settings.service_fee))
    booking = Booking(
        booking_code=f"PDL-{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S%f')[-10:]}",
        user_id=player.id,
        venue_id=venue.id,
        court_id=court.id,
        booking_date=payload.booking_date,
        status=BookingStatus.confirmed,
        court_fee=court_fee,
        service_fee=service_fee,
        total_amount=court_fee + service_fee,
        policy_version_id=policy.id,
        policy_accepted_at=datetime.now(timezone.utc),
    )
    try:
        db.add(booking)
        await db.flush()
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
        payment = Payment(
            booking_id=booking.id,
            provider="venue-front-desk",
            provider_reference=payload.payment_reference.strip() if payload.payment_reference else f"FD-{uuid4().hex[:14].upper()}",
            method=payload.payment_method.strip().lower(),
            amount=booking.total_amount,
            currency=booking.currency,
            status=PaymentStatus.paid,
            provider_metadata={"created_by_staff_user_id": str(user.id), "source": "venue-front-desk"},
        )
        db.add(payment)
        db.add(
            Notification(
                user_id=player.id,
                kind="booking_confirmed",
                title="Booking confirmed",
                body=f"Venue staff confirmed your booking {booking.booking_code}.",
                payload={"booking_id": str(booking.id), "booking_code": booking.booking_code, "source": "front_desk"},
            )
        )
        await db.commit()
        await db.refresh(booking)
        await db.refresh(payment)
    except Exception:
        await db.rollback()
        await slot_locks.release_result(lock)
        raise
    await slot_locks.release_result(lock)
    return {
        "id": str(booking.id),
        "booking_code": booking.booking_code,
        "status": booking.status.value,
        "player": {"id": str(player.id), "full_name": player.full_name},
        "court": {"id": str(court.id), "name": court.name},
        "date": booking.booking_date.isoformat(),
        "slots": [slot["start_time"].isoformat(timespec="minutes") for slot in slots],
        "total": f"{booking.total_amount:.2f}",
        "currency": booking.currency,
        "payment_id": str(payment.id),
        "payment_status": payment.status.value,
        "payment_reference": payment.provider_reference,
    }


@router.get("/pricing-rules")
async def list_venue_pricing_rules(
    venue_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await ensure_venue_access(user, venue_id, db)
    rows = (
        await db.scalars(
            select(PricingRule)
            .where(PricingRule.venue_id == venue_id, PricingRule.is_active.is_(True))
            .order_by(PricingRule.priority.desc(), PricingRule.start_time)
        )
    ).all()
    return [
        {
            "id": str(row.id),
            "venue_id": str(row.venue_id),
            "court_id": str(row.court_id) if row.court_id else None,
            "court_type": row.court_type,
            "valid_from": row.valid_from.isoformat() if row.valid_from else None,
            "valid_to": row.valid_to.isoformat() if row.valid_to else None,
            "weekdays": row.weekdays,
            "start_time": row.start_time.isoformat(timespec="minutes"),
            "end_time": row.end_time.isoformat(timespec="minutes"),
            "hourly_rate": f"{row.hourly_rate:.2f}",
            "currency": row.currency,
            "priority": row.priority,
        }
        for row in rows
    ]


@router.post("/pricing-rules")
async def create_venue_pricing_rule(
    payload: VenuePricingRuleRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, payload.venue_id, db, manager_only=True)
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "End time must be after start time")
    if payload.valid_from and payload.valid_to and payload.valid_to < payload.valid_from:
        raise HTTPException(400, "valid_to cannot be before valid_from")
    if any(day < 0 or day > 6 for day in payload.weekdays):
        raise HTTPException(400, "Weekdays must use values 0 through 6")
    if payload.court_id:
        court = await db.get(Court, payload.court_id)
        if not court or court.venue_id != payload.venue_id:
            raise HTTPException(400, "Court does not belong to the selected venue")
    venue = await db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    rule = PricingRule(
        venue_id=payload.venue_id,
        court_id=payload.court_id,
        court_type=payload.court_type.strip() if payload.court_type else None,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        weekdays=sorted(set(payload.weekdays)),
        start_time=payload.start_time,
        end_time=payload.end_time,
        hourly_rate=payload.hourly_rate,
        currency=payload.currency.upper(),
        priority=payload.priority,
        is_active=True,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"id": str(rule.id), "is_active": True}


@router.delete("/pricing-rules/{rule_id}")
async def deactivate_venue_pricing_rule(
    rule_id: UUID,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rule = await db.get(PricingRule, rule_id)
    if not rule:
        raise HTTPException(404, "Pricing rule not found")
    await ensure_venue_access(user, rule.venue_id, db, manager_only=True)
    rule.is_active = False
    await db.commit()
    return {"id": str(rule.id), "is_active": False}


@router.get("/finance")
async def venue_finance(
    venue_id: UUID,
    from_date: date,
    to_date: date,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, venue_id, db)
    _date_bounds(from_date, to_date)
    payments = (
        await db.execute(
            select(Payment, Booking, User)
            .join(Booking, Booking.id == Payment.booking_id)
            .join(User, User.id == Booking.user_id)
            .where(
                Booking.venue_id == venue_id,
                Booking.booking_date >= from_date,
                Booking.booking_date <= to_date,
            )
            .order_by(Booking.booking_date.desc(), Payment.created_at.desc())
        )
    ).all()
    payment_ids = [payment.id for payment, _booking, _player in payments]
    refunds = []
    if payment_ids:
        refunds = (
            await db.scalars(
                select(Refund)
                .where(Refund.payment_id.in_(payment_ids))
                .order_by(Refund.created_at.desc())
            )
        ).all()
    refund_by_payment: dict[UUID, Refund] = {}
    for refund in refunds:
        refund_by_payment.setdefault(refund.payment_id, refund)

    gross = Decimal("0")
    refunded = Decimal("0")
    rows = []
    for payment, booking, player in payments:
        if payment.status in {PaymentStatus.paid, PaymentStatus.refunded, PaymentStatus.partially_refunded}:
            gross += payment.amount
        refund = refund_by_payment.get(payment.id)
        if refund and refund.status == RefundStatus.completed:
            refunded += refund.amount
        rows.append(
            {
                "payment_id": str(payment.id),
                "booking_id": str(booking.id),
                "booking_code": booking.booking_code,
                "booking_date": booking.booking_date.isoformat(),
                "player_name": player.full_name,
                "method": payment.method,
                "provider": payment.provider,
                "provider_reference": payment.provider_reference,
                "payment_status": payment.status.value,
                "amount": f"{payment.amount:.2f}",
                "currency": payment.currency,
                "refund": None
                if not refund
                else {
                    "id": str(refund.id),
                    "status": refund.status.value,
                    "amount": f"{refund.amount:.2f}",
                    "reason": refund.reason,
                    "provider_reference": refund.provider_reference,
                },
            }
        )
    return {
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "currency": "PKR",
        "gross_paid": f"{gross:.2f}",
        "refunded": f"{refunded:.2f}",
        "net_paid": f"{gross - refunded:.2f}",
        "transactions": rows,
    }


@router.patch("/refunds/{refund_id}")
async def update_venue_refund(
    refund_id: UUID,
    payload: VenueRefundUpdateRequest,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(404, "Refund not found")
    booking = await db.get(Booking, refund.booking_id)
    if not booking:
        raise HTTPException(404, "Booking not found")
    await ensure_venue_access(user, booking.venue_id, db, manager_only=True)
    if payload.status not in {RefundStatus.processing, RefundStatus.completed, RefundStatus.rejected}:
        raise HTTPException(400, "Refund can only be moved to processing, completed or rejected")
    refund.status = payload.status
    if payload.provider_reference:
        refund.provider_reference = payload.provider_reference.strip()
    payment = await db.get(Payment, refund.payment_id)
    if payload.status == RefundStatus.completed and payment:
        payment.status = PaymentStatus.refunded if refund.amount >= payment.amount else PaymentStatus.partially_refunded
    player = await db.get(User, booking.user_id)
    if player:
        title = "Refund completed" if payload.status == RefundStatus.completed else "Refund update"
        body = (
            f"Your refund for booking {booking.booking_code} has been completed."
            if payload.status == RefundStatus.completed
            else f"Refund for booking {booking.booking_code} is now {payload.status.value}."
        )
        db.add(
            Notification(
                user_id=player.id,
                kind=f"refund_{payload.status.value}",
                title=title,
                body=body,
                payload={"booking_id": str(booking.id), "refund_id": str(refund.id)},
            )
        )
    await db.commit()
    return {"id": str(refund.id), "status": refund.status.value}


@router.get("/reports/summary")
async def venue_report_summary(
    venue_id: UUID,
    from_date: date,
    to_date: date,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await ensure_venue_access(user, venue_id, db)
    _date_bounds(from_date, to_date)
    venue = await db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")

    active_statuses = [BookingStatus.confirmed, BookingStatus.completed, BookingStatus.rescheduled]
    booking_filters = [Booking.venue_id == venue_id, Booking.booking_date >= from_date, Booking.booking_date <= to_date]
    total_bookings = await db.scalar(select(func.count(Booking.id)).where(*booking_filters)) or 0
    active_bookings = await db.scalar(select(func.count(Booking.id)).where(*booking_filters, Booking.status.in_(active_statuses))) or 0
    cancelled_bookings = await db.scalar(
        select(func.count(Booking.id)).where(
            *booking_filters,
            Booking.status.in_([BookingStatus.cancelled, BookingStatus.venue_cancelled]),
        )
    ) or 0
    booked_hours = await db.scalar(
        select(func.count(BookingSlot.id))
        .join(Booking, Booking.id == BookingSlot.booking_id)
        .where(*booking_filters, Booking.status.in_(active_statuses))
    ) or 0
    checkins = await db.scalar(
        select(func.count(BookingCheckIn.id))
        .join(Booking, Booking.id == BookingCheckIn.booking_id)
        .where(*booking_filters)
    ) or 0

    payment_rows = (
        await db.scalars(
            select(Payment)
            .join(Booking, Booking.id == Payment.booking_id)
            .where(*booking_filters)
        )
    ).all()
    gross = sum(
        (payment.amount for payment in payment_rows if payment.status in {PaymentStatus.paid, PaymentStatus.refunded, PaymentStatus.partially_refunded}),
        Decimal("0"),
    )
    payment_ids = [payment.id for payment in payment_rows]
    completed_refunds = Decimal("0")
    if payment_ids:
        completed_refunds = await db.scalar(
            select(func.coalesce(func.sum(Refund.amount), 0)).where(
                Refund.payment_id.in_(payment_ids), Refund.status == RefundStatus.completed
            )
        ) or Decimal("0")

    active_courts = await db.scalar(select(func.count(Court.id)).where(Court.venue_id == venue_id)) or 0
    open_hours = max(0.0, (datetime.combine(date.min, venue.closing_time) - datetime.combine(date.min, venue.opening_time)).total_seconds() / 3600)
    days = (to_date - from_date).days + 1
    available_court_hours = float(active_courts) * open_hours * days
    occupancy = (float(booked_hours) / available_court_hours * 100) if available_court_hours else 0.0

    return {
        "venue_id": str(venue.id),
        "venue_name": venue.name,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "currency": "PKR",
        "total_bookings": int(total_bookings),
        "active_bookings": int(active_bookings),
        "cancelled_bookings": int(cancelled_bookings),
        "booked_hours": int(booked_hours),
        "checkins": int(checkins),
        "gross_paid": f"{Decimal(gross):.2f}",
        "refunded": f"{Decimal(completed_refunds):.2f}",
        "net_paid": f"{Decimal(gross) - Decimal(completed_refunds):.2f}",
        "available_court_hours": round(available_court_hours, 2),
        "occupancy_percent": round(occupancy, 1),
    }
