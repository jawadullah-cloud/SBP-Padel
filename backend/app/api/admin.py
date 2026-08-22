from datetime import date, time
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import Court, CourtStatus, PricingRule, User, UserRole, Venue

router = APIRouter(prefix="/admin", tags=["administration"])
admin_user = require_roles(UserRole.admin)


class CourtStatusRequest(BaseModel):
    status: CourtStatus


class VenueStatusRequest(BaseModel):
    is_active: bool


class PricingRuleRequest(BaseModel):
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


@router.get("/venues")
async def admin_venues(
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    venues = (await db.scalars(select(Venue).order_by(Venue.city, Venue.name))).all()
    return [
        {
            "id": str(v.id),
            "name": v.name,
            "city": v.city,
            "is_active": v.is_active,
            "opening_time": v.opening_time.isoformat(timespec="minutes"),
            "closing_time": v.closing_time.isoformat(timespec="minutes"),
        }
        for v in venues
    ]


@router.patch("/venues/{venue_id}/status")
async def set_venue_status(
    venue_id: UUID,
    payload: VenueStatusRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    venue = await db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    venue.is_active = payload.is_active
    await db.commit()
    return {"id": str(venue.id), "is_active": venue.is_active}


@router.get("/venues/{venue_id}/courts")
async def admin_courts(
    venue_id: UUID,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    courts = (
        await db.scalars(select(Court).where(Court.venue_id == venue_id).order_by(Court.code))
    ).all()
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "name": c.name,
            "court_type": c.court_type,
            "status": c.status.value,
        }
        for c in courts
    ]


@router.patch("/courts/{court_id}/status")
async def set_court_status(
    court_id: UUID,
    payload: CourtStatusRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    court = await db.get(Court, court_id)
    if not court:
        raise HTTPException(404, "Court not found")
    court.status = payload.status
    await db.commit()
    return {"id": str(court.id), "status": court.status.value}


@router.get("/pricing-rules")
async def list_pricing_rules(
    venue_id: UUID | None = None,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(PricingRule).order_by(PricingRule.priority.desc(), PricingRule.start_time)
    if venue_id:
        stmt = stmt.where(PricingRule.venue_id == venue_id)
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "id": str(r.id),
            "venue_id": str(r.venue_id),
            "court_id": str(r.court_id) if r.court_id else None,
            "court_type": r.court_type,
            "valid_from": r.valid_from.isoformat() if r.valid_from else None,
            "valid_to": r.valid_to.isoformat() if r.valid_to else None,
            "weekdays": r.weekdays,
            "start_time": r.start_time.isoformat(timespec="minutes"),
            "end_time": r.end_time.isoformat(timespec="minutes"),
            "hourly_rate": f"{r.hourly_rate:.2f}",
            "currency": r.currency,
            "priority": r.priority,
            "is_active": r.is_active,
        }
        for r in rows
    ]


@router.post("/pricing-rules")
async def create_pricing_rule(
    payload: PricingRuleRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    venue = await db.get(Venue, payload.venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    if payload.end_time <= payload.start_time:
        raise HTTPException(400, "End time must be after start time")
    if payload.valid_from and payload.valid_to and payload.valid_to < payload.valid_from:
        raise HTTPException(400, "valid_to cannot be before valid_from")
    if any(day < 0 or day > 6 for day in payload.weekdays):
        raise HTTPException(400, "Weekdays must use values 0 through 6")
    if payload.court_id:
        court = await db.get(Court, payload.court_id)
        if not court or court.venue_id != venue.id:
            raise HTTPException(400, "Court does not belong to the selected venue")

    rule = PricingRule(
        venue_id=payload.venue_id,
        court_id=payload.court_id,
        court_type=payload.court_type,
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
    return {"id": str(rule.id), "is_active": rule.is_active}


@router.delete("/pricing-rules/{rule_id}")
async def deactivate_pricing_rule(
    rule_id: UUID,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rule = await db.get(PricingRule, rule_id)
    if not rule:
        raise HTTPException(404, "Pricing rule not found")
    rule.is_active = False
    await db.commit()
    return {"id": str(rule.id), "is_active": False}
