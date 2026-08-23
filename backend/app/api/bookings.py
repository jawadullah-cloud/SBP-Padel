from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import current_user
from app.core.slot_locks import slot_locks
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Court, CourtStatus, PolicyVersion, PricingRule, User, Venue
from app.models.operations import VenueBlock

router = APIRouter(prefix="/bookings", tags=["bookings"])
PERMANENT_BLOCKING_STATUSES = {BookingStatus.confirmed, BookingStatus.completed, BookingStatus.rescheduled}


class SlotRequest(BaseModel):
    start_time: time


class QuoteRequest(BaseModel):
    venue_id: UUID
    court_id: UUID
    booking_date: date
    slots: list[SlotRequest] = Field(min_length=1, max_length=8)


class CreateBookingRequest(QuoteRequest):
    policy_version_id: UUID
    policy_accepted: bool


def venue_now(venue: Venue) -> datetime:
    try:
        tz = ZoneInfo(venue.timezone or "UTC")
    except ZoneInfoNotFoundError:
        tz = timezone.utc
    return datetime.now(tz)


def resolve_rate(rules: list[PricingRule], court: Court, slot_date: date, start_time: time) -> Decimal | None:
    candidates: list[PricingRule] = []
    weekday = slot_date.weekday()
    for rule in rules:
        if not rule.is_active or (rule.court_id and rule.court_id != court.id) or (rule.court_type and rule.court_type != court.court_type):
            continue
        if rule.valid_from and slot_date < rule.valid_from:
            continue
        if rule.valid_to and slot_date > rule.valid_to:
            continue
        if rule.weekdays and weekday not in rule.weekdays:
            continue
        if not (rule.start_time <= start_time < rule.end_time):
            continue
        candidates.append(rule)
    if not candidates:
        return None
    candidates.sort(key=lambda rule: (rule.priority, 1 if rule.court_id else 0), reverse=True)
    return candidates[0].hourly_rate


def blocking_condition():
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.slot_hold_minutes)
    return or_(Booking.status.in_(PERMANENT_BLOCKING_STATUSES), and_(Booking.status == BookingStatus.pending_payment, Booking.created_at >= cutoff))


async def quote_payload(payload: QuoteRequest, db: AsyncSession) -> tuple[Venue, Court, list[dict], Decimal]:
    venue = await db.get(Venue, payload.venue_id)
    court = await db.get(Court, payload.court_id)
    if not venue or not venue.is_active or not court or court.venue_id != venue.id:
        raise HTTPException(404, "Venue or court not found")
    if court.status != CourtStatus.active:
        raise HTTPException(409, "Court is not currently bookable")

    local_now = venue_now(venue)
    if payload.booking_date < local_now.date():
        raise HTTPException(400, "Past dates cannot be booked")

    requested = sorted({slot.start_time.replace(second=0, microsecond=0) for slot in payload.slots})
    rules = (await db.scalars(select(PricingRule).where(PricingRule.venue_id == venue.id, PricingRule.is_active.is_(True)))).all()
    blocks = (await db.scalars(select(VenueBlock).where(VenueBlock.venue_id == venue.id, VenueBlock.block_date == payload.booking_date, VenueBlock.is_active.is_(True), or_(VenueBlock.court_id.is_(None), VenueBlock.court_id == court.id)))).all()
    blocking = (await db.execute(select(BookingSlot.start_time).join(Booking, Booking.id == BookingSlot.booking_id).where(BookingSlot.court_id == court.id, BookingSlot.booking_date == payload.booking_date, blocking_condition(), BookingSlot.start_time.in_(requested)))).scalars().all()
    if blocking:
        raise HTTPException(409, "One or more selected slots are no longer available")

    details: list[dict] = []
    total = Decimal("0")
    for start in requested:
        if start < venue.opening_time or start >= venue.closing_time:
            raise HTTPException(400, f"Slot {start.isoformat(timespec='minutes')} is outside venue hours")
        if payload.booking_date == local_now.date() and datetime.combine(payload.booking_date, start, tzinfo=local_now.tzinfo) <= local_now:
            raise HTTPException(409, f"Slot {start.isoformat(timespec='minutes')} has already started")
        end = time((start.hour + 1) % 24, start.minute)
        block = next((b for b in blocks if b.start_time < end and b.end_time > start), None)
        if block:
            raise HTTPException(409, f"Slot {start.isoformat(timespec='minutes')} is unavailable: {block.reason}")
        rate = resolve_rate(rules, court, payload.booking_date, start)
        if rate is None:
            raise HTTPException(409, f"No active price is configured for {start.isoformat(timespec='minutes')}")
        details.append({"start_time": start, "end_time": end, "rate": rate})
        total += rate
    return venue, court, details, total


@router.post("/quote")
async def quote(payload: QuoteRequest, db: AsyncSession = Depends(get_db)) -> dict:
    venue, court, slots, court_fee = await quote_payload(payload, db)
    service_fee = Decimal(str(settings.service_fee))
    return {"venue": {"id": str(venue.id), "name": venue.name}, "court": {"id": str(court.id), "name": court.name, "court_type": court.court_type}, "date": payload.booking_date.isoformat(), "slots": [{"start_time": slot["start_time"].isoformat(timespec="minutes"), "end_time": slot["end_time"].isoformat(timespec="minutes"), "rate": f'{slot["rate"]:.2f}', "currency": "PKR"} for slot in slots], "court_fee": f"{court_fee:.2f}", "service_fee": f"{service_fee:.2f}", "total": f"{court_fee + service_fee:.2f}", "currency": "PKR"}


@router.post("")
async def create_booking(payload: CreateBookingRequest, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    if not payload.policy_accepted:
        raise HTTPException(400, "Booking policy must be accepted")
    policy = await db.scalar(select(PolicyVersion).where(PolicyVersion.id == payload.policy_version_id, PolicyVersion.is_active.is_(True), PolicyVersion.effective_from <= datetime.now(timezone.utc)))
    if not policy:
        raise HTTPException(409, "The selected booking policy is no longer active")
    venue, court, slots, court_fee = await quote_payload(payload, db)
    lock = await slot_locks.acquire(court.id, payload.booking_date, [slot["start_time"] for slot in slots])
    if not lock.acquired:
        raise HTTPException(409, "One or more selected slots are being reserved by another player")
    service_fee = Decimal(str(settings.service_fee))
    booking = Booking(booking_code=f"PDL-{datetime.now(timezone.utc).strftime('%y%m%d%H%M%S%f')[-10:]}", user_id=user.id, venue_id=venue.id, court_id=court.id, booking_date=payload.booking_date, status=BookingStatus.pending_payment, court_fee=court_fee, service_fee=service_fee, total_amount=court_fee + service_fee, policy_version_id=policy.id, policy_accepted_at=datetime.now(timezone.utc))
    try:
        db.add(booking)
        await db.flush()
        for slot in slots:
            db.add(BookingSlot(booking_id=booking.id, court_id=court.id, booking_date=payload.booking_date, start_time=slot["start_time"], end_time=slot["end_time"], rate_snapshot=slot["rate"]))
        await slot_locks.bind_booking(booking.id, lock)
        await db.commit()
    except Exception:
        await db.rollback()
        await slot_locks.release_result(lock)
        raise
    return {"id": str(booking.id), "booking_code": booking.booking_code, "status": booking.status.value, "amount_due": f"{booking.total_amount:.2f}", "currency": booking.currency, "hold_minutes": settings.slot_hold_minutes, "atomic_lock": lock.redis_used}


@router.get("/me")
async def my_bookings(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.scalars(select(Booking).where(Booking.user_id == user.id).order_by(Booking.booking_date.desc(), Booking.created_at.desc()))).all()
    return [{"id": str(b.id), "booking_code": b.booking_code, "date": b.booking_date.isoformat(), "status": b.status.value, "court_id": str(b.court_id), "venue_id": str(b.venue_id), "total": f"{b.total_amount:.2f}", "currency": b.currency} for b in rows]


@router.get("/{booking_id}")
async def booking_detail(booking_id: UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> dict:
    booking = await db.get(Booking, booking_id)
    if not booking or booking.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    slots = (await db.scalars(select(BookingSlot).where(BookingSlot.booking_id == booking.id).order_by(BookingSlot.start_time))).all()
    return {"id": str(booking.id), "booking_code": booking.booking_code, "date": booking.booking_date.isoformat(), "status": booking.status.value, "venue_id": str(booking.venue_id), "court_id": str(booking.court_id), "slots": [{"start_time": s.start_time.isoformat(timespec="minutes"), "end_time": s.end_time.isoformat(timespec="minutes"), "rate": f"{s.rate_snapshot:.2f}"} for s in slots], "court_fee": f"{booking.court_fee:.2f}", "service_fee": f"{booking.service_fee:.2f}", "total": f"{booking.total_amount:.2f}", "currency": booking.currency, "policy_accepted_at": booking.policy_accepted_at.isoformat() if booking.policy_accepted_at else None}
