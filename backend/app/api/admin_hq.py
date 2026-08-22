from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, require_roles
from app.db.session import get_db
from app.models.domain import (
    Booking,
    BookingStatus,
    Court,
    CourtStatus,
    Payment,
    PaymentStatus,
    PolicyVersion,
    Refund,
    RefundStatus,
    User,
    UserRole,
    Venue,
)
from app.models.operations import UserVenueAssignment, VenueAssignmentRole

router = APIRouter(prefix="/admin", tags=["central administration"])
admin_user = require_roles(UserRole.admin)


class VenueCreateRequest(BaseModel):
    name: str = Field(min_length=3, max_length=180)
    city: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=3, max_length=300)
    latitude: Decimal
    longitude: Decimal
    description: str | None = None
    amenities: list[str] = Field(default_factory=list)
    opening_time: time = time(6, 0)
    closing_time: time = time(23, 0)


class CourtCreateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=2, max_length=120)
    court_type: str = Field(min_length=2, max_length=80)
    capacity: int = Field(default=4, ge=1, le=20)
    is_indoor: bool = False


class StaffCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole


class StaffAssignmentRequest(BaseModel):
    user_id: UUID
    venue_id: UUID
    role: VenueAssignmentRole


class PolicyPublishRequest(BaseModel):
    version: str = Field(min_length=2, max_length=40)
    title: str = Field(min_length=3, max_length=180)
    body: str = Field(min_length=20)
    effective_from: datetime | None = None


class RefundStatusRequest(BaseModel):
    status: RefundStatus
    provider_reference: str | None = Field(default=None, max_length=150)


@router.post("/venues")
async def create_venue(
    payload: VenueCreateRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if payload.closing_time <= payload.opening_time:
        raise HTTPException(400, "Closing time must be after opening time")
    venue = Venue(
        name=payload.name.strip(),
        city=payload.city.strip(),
        address=payload.address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description.strip() if payload.description else None,
        amenities=sorted(set(a.strip() for a in payload.amenities if a.strip())),
        opening_time=payload.opening_time,
        closing_time=payload.closing_time,
        is_active=True,
    )
    db.add(venue)
    await db.commit()
    await db.refresh(venue)
    return {"id": str(venue.id), "name": venue.name, "city": venue.city, "is_active": True}


@router.post("/venues/{venue_id}/courts")
async def create_court(
    venue_id: UUID,
    payload: CourtCreateRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    venue = await db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(404, "Venue not found")
    existing = await db.scalar(select(Court).where(Court.venue_id == venue_id, Court.code == payload.code.strip()))
    if existing:
        raise HTTPException(409, "Court code already exists at this venue")
    court = Court(
        venue_id=venue_id,
        code=payload.code.strip(),
        name=payload.name.strip(),
        court_type=payload.court_type.strip(),
        capacity=payload.capacity,
        is_indoor=payload.is_indoor,
        status=CourtStatus.active,
    )
    db.add(court)
    await db.commit()
    await db.refresh(court)
    return {"id": str(court.id), "code": court.code, "name": court.name, "status": court.status.value}


@router.get("/staff")
async def list_staff(
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
) -> list[dict]:
    users = (
        await db.scalars(
            select(User)
            .where(User.role.in_([UserRole.admin, UserRole.venue_manager, UserRole.venue_operator]))
            .order_by(User.full_name)
        )
    ).all()
    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.post("/staff")
async def create_staff(
    payload: StaffCreateRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if payload.role not in {UserRole.admin, UserRole.venue_manager, UserRole.venue_operator}:
        raise HTTPException(400, "Staff role is required")
    email = payload.email.lower()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email is already in use")
    user = User(
        full_name=payload.full_name.strip(),
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "full_name": user.full_name, "role": user.role.value}


@router.get("/staff-assignments")
async def list_assignments(
    venue_id: UUID | None = Query(default=None),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = (
        select(UserVenueAssignment, User, Venue)
        .join(User, User.id == UserVenueAssignment.user_id)
        .join(Venue, Venue.id == UserVenueAssignment.venue_id)
        .where(UserVenueAssignment.is_active.is_(True))
        .order_by(Venue.city, Venue.name, User.full_name)
    )
    if venue_id:
        stmt = stmt.where(UserVenueAssignment.venue_id == venue_id)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": str(a.id),
            "user_id": str(u.id),
            "user_name": u.full_name,
            "user_email": u.email,
            "venue_id": str(v.id),
            "venue_name": v.name,
            "role": a.role.value,
        }
        for a, u, v in rows
    ]


@router.post("/staff-assignments")
async def assign_staff(
    payload: StaffAssignmentRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user = await db.get(User, payload.user_id)
    venue = await db.get(Venue, payload.venue_id)
    if not user or not venue:
        raise HTTPException(404, "User or venue not found")
    expected_role = UserRole.venue_manager if payload.role == VenueAssignmentRole.manager else UserRole.venue_operator
    if user.role != expected_role:
        raise HTTPException(400, f"User must have role {expected_role.value}")
    assignment = await db.scalar(
        select(UserVenueAssignment).where(
            UserVenueAssignment.user_id == user.id,
            UserVenueAssignment.venue_id == venue.id,
        )
    )
    if assignment:
        assignment.role = payload.role
        assignment.is_active = True
    else:
        assignment = UserVenueAssignment(user_id=user.id, venue_id=venue.id, role=payload.role, is_active=True)
        db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return {"id": str(assignment.id), "is_active": True, "role": assignment.role.value}


@router.delete("/staff-assignments/{assignment_id}")
async def deactivate_assignment(
    assignment_id: UUID,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    assignment = await db.get(UserVenueAssignment, assignment_id)
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    assignment.is_active = False
    await db.commit()
    return {"id": str(assignment.id), "is_active": False}


@router.get("/policies")
async def list_policies(
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
) -> list[dict]:
    policies = (await db.scalars(select(PolicyVersion).order_by(PolicyVersion.effective_from.desc()))).all()
    return [
        {
            "id": str(p.id),
            "version": p.version,
            "title": p.title,
            "effective_from": p.effective_from.isoformat(),
            "is_active": p.is_active,
        }
        for p in policies
    ]


@router.post("/policies/publish")
async def publish_policy(
    payload: PolicyPublishRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if await db.scalar(select(PolicyVersion.id).where(PolicyVersion.version == payload.version)):
        raise HTTPException(409, "Policy version already exists")
    await db.execute(update(PolicyVersion).values(is_active=False))
    policy = PolicyVersion(
        version=payload.version.strip(),
        title=payload.title.strip(),
        body=payload.body.strip(),
        effective_from=payload.effective_from or datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return {"id": str(policy.id), "version": policy.version, "is_active": True}


@router.get("/bookings")
async def admin_booking_search(
    venue_id: UUID | None = None,
    booking_date: date | None = None,
    status: BookingStatus | None = None,
    q: str | None = None,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Booking).order_by(Booking.created_at.desc()).limit(500)
    if venue_id:
        stmt = stmt.where(Booking.venue_id == venue_id)
    if booking_date:
        stmt = stmt.where(Booking.booking_date == booking_date)
    if status:
        stmt = stmt.where(Booking.status == status)
    if q:
        stmt = stmt.where(Booking.booking_code.ilike(f"%{q.strip()}%"))
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "id": str(b.id),
            "booking_code": b.booking_code,
            "venue_id": str(b.venue_id),
            "court_id": str(b.court_id),
            "date": b.booking_date.isoformat(),
            "status": b.status.value,
            "total": f"{b.total_amount:.2f}",
            "currency": b.currency,
        }
        for b in rows
    ]


@router.get("/refunds")
async def admin_refunds(
    status: RefundStatus | None = None,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    stmt = select(Refund).order_by(Refund.created_at.desc()).limit(500)
    if status:
        stmt = stmt.where(Refund.status == status)
    rows = (await db.scalars(stmt)).all()
    return [
        {
            "id": str(r.id),
            "booking_id": str(r.booking_id),
            "payment_id": str(r.payment_id),
            "amount": f"{r.amount:.2f}",
            "currency": r.currency,
            "status": r.status.value,
            "reason": r.reason,
            "provider_reference": r.provider_reference,
        }
        for r in rows
    ]


@router.patch("/refunds/{refund_id}")
async def update_refund_status(
    refund_id: UUID,
    payload: RefundStatusRequest,
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    refund = await db.get(Refund, refund_id)
    if not refund:
        raise HTTPException(404, "Refund not found")
    refund.status = payload.status
    if payload.provider_reference:
        refund.provider_reference = payload.provider_reference
    if payload.status == RefundStatus.completed:
        payment = await db.get(Payment, refund.payment_id)
        if payment:
            payment.status = PaymentStatus.refunded if refund.amount >= payment.amount else PaymentStatus.partially_refunded
    await db.commit()
    return {"id": str(refund.id), "status": refund.status.value}


@router.get("/dashboard")
async def admin_dashboard(
    _: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
) -> dict:
    venue_count = await db.scalar(select(func.count()).select_from(Venue)) or 0
    court_count = await db.scalar(select(func.count()).select_from(Court)) or 0
    player_count = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.player)) or 0
    confirmed = await db.scalar(select(func.count()).select_from(Booking).where(Booking.status == BookingStatus.confirmed)) or 0
    paid_total = await db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.paid)) or Decimal("0")
    pending_refunds = await db.scalar(select(func.count()).select_from(Refund).where(Refund.status.in_([RefundStatus.requested, RefundStatus.processing]))) or 0
    return {
        "venues": venue_count,
        "courts": court_count,
        "players": player_count,
        "confirmed_bookings": confirmed,
        "paid_revenue": f"{Decimal(paid_total):.2f}",
        "pending_refunds": pending_refunds,
        "currency": "PKR",
    }
