from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.domain import BookingSlot, Court, CourtStatus, PricingRule, Venue

router = APIRouter()


def money(value: Decimal | None) -> str | None:
    return None if value is None else f"{value:.2f}"


def resolve_rate(rules: list[PricingRule], court: Court, slot_date: date, start_hour: int) -> Decimal | None:
    candidates: list[PricingRule] = []
    weekday = slot_date.weekday()
    for rule in rules:
        if not rule.is_active:
            continue
        if rule.court_id and rule.court_id != court.id:
            continue
        if rule.court_type and rule.court_type != court.court_type:
            continue
        if rule.valid_from and slot_date < rule.valid_from:
            continue
        if rule.valid_to and slot_date > rule.valid_to:
            continue
        if rule.weekdays and weekday not in rule.weekdays:
            continue
        if not (rule.start_time.hour <= start_hour < rule.end_time.hour):
            continue
        candidates.append(rule)
    if not candidates:
        return None
    candidates.sort(key=lambda r: (r.priority, 1 if r.court_id else 0), reverse=True)
    return candidates[0].hourly_rate


@router.get("/health", tags=["system"])
async def health() -> dict:
    return {"status": "ok", "service": "SBP Padel API"}


@router.get("/venues", tags=["venues"])
async def list_venues(
    city: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Venue).where(Venue.is_active.is_(True)).order_by(Venue.city, Venue.name)
    if city:
        stmt = stmt.where(Venue.city.ilike(city))
    if q:
        stmt = stmt.where((Venue.name.ilike(f"%{q}%")) | (Venue.city.ilike(f"%{q}%")))
    venues = (await db.scalars(stmt)).all()
    return [
        {
            "id": str(v.id),
            "name": v.name,
            "city": v.city,
            "address": v.address,
            "latitude": float(v.latitude),
            "longitude": float(v.longitude),
            "amenities": v.amenities,
            "opening_time": v.opening_time.isoformat(timespec="minutes"),
            "closing_time": v.closing_time.isoformat(timespec="minutes"),
        }
        for v in venues
    ]


@router.get("/venues/{venue_id}", tags=["venues"])
async def get_venue(venue_id: UUID, db: AsyncSession = Depends(get_db)) -> dict:
    venue = await db.get(Venue, venue_id)
    if not venue or not venue.is_active:
        raise HTTPException(status_code=404, detail="Venue not found")
    courts = (
        await db.scalars(select(Court).where(Court.venue_id == venue.id).order_by(Court.code))
    ).all()
    return {
        "id": str(venue.id),
        "name": venue.name,
        "city": venue.city,
        "address": venue.address,
        "description": venue.description,
        "latitude": float(venue.latitude),
        "longitude": float(venue.longitude),
        "timezone": venue.timezone,
        "amenities": venue.amenities,
        "opening_time": venue.opening_time.isoformat(timespec="minutes"),
        "closing_time": venue.closing_time.isoformat(timespec="minutes"),
        "courts": [
            {
                "id": str(c.id),
                "code": c.code,
                "name": c.name,
                "court_type": c.court_type,
                "capacity": c.capacity,
                "is_indoor": c.is_indoor,
                "status": c.status.value,
            }
            for c in courts
        ],
    }


@router.get("/venues/{venue_id}/availability", tags=["availability"])
async def venue_availability(
    venue_id: UUID,
    target_date: date = Query(alias="date"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    venue = await db.get(Venue, venue_id)
    if not venue or not venue.is_active:
        raise HTTPException(status_code=404, detail="Venue not found")

    courts = (
        await db.scalars(
            select(Court)
            .where(and_(Court.venue_id == venue.id, Court.status == CourtStatus.active))
            .order_by(Court.code)
        )
    ).all()
    rules = (
        await db.scalars(
            select(PricingRule).where(
                and_(PricingRule.venue_id == venue.id, PricingRule.is_active.is_(True))
            )
        )
    ).all()
    booked = (
        await db.scalars(
            select(BookingSlot).where(
                and_(BookingSlot.booking_date == target_date, BookingSlot.court_id.in_([c.id for c in courts]))
            )
        )
    ).all() if courts else []
    booked_keys = {(b.court_id, b.start_time.hour) for b in booked}

    first_hour = venue.opening_time.hour
    last_hour = venue.closing_time.hour
    result = []
    for court in courts:
        slots = []
        for hour in range(first_hour, last_hour):
            start = datetime.combine(target_date, datetime.min.time()).replace(hour=hour)
            end = start + timedelta(hours=1)
            rate = resolve_rate(rules, court, target_date, hour)
            is_booked = (court.id, hour) in booked_keys
            slots.append(
                {
                    "start_time": start.time().isoformat(timespec="minutes"),
                    "end_time": end.time().isoformat(timespec="minutes"),
                    "available": not is_booked and rate is not None,
                    "hourly_rate": money(rate),
                    "currency": "PKR",
                }
            )
        result.append(
            {
                "court_id": str(court.id),
                "court_code": court.code,
                "court_name": court.name,
                "court_type": court.court_type,
                "slots": slots,
            }
        )

    return {
        "venue_id": str(venue.id),
        "venue_name": venue.name,
        "date": target_date.isoformat(),
        "timezone": venue.timezone,
        "courts": result,
    }
