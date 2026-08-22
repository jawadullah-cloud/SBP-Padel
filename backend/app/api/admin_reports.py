from datetime import date, datetime, time, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.db.session import get_db
from app.models.domain import Booking, BookingSlot, BookingStatus, Payment, PaymentStatus, User, UserRole, Venue

router = APIRouter(prefix="/admin/reports", tags=["administration reports"])
admin_user = require_roles(UserRole.admin)


def period(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    return datetime.combine(from_date, time.min, tzinfo=timezone.utc), datetime.combine(to_date, time.max, tzinfo=timezone.utc)


@router.get("/venue-performance")
async def venue_performance(
    from_date: date = Query(...),
    to_date: date = Query(...),
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    start, end = period(from_date, to_date)
    venues = (await db.scalars(select(Venue).order_by(Venue.city, Venue.name))).all()
    result = []
    for venue in venues:
        bookings = await db.scalar(
            select(func.count(Booking.id)).where(
                Booking.venue_id == venue.id,
                Booking.created_at >= start,
                Booking.created_at <= end,
                Booking.status.in_([BookingStatus.confirmed, BookingStatus.completed]),
            )
        ) or 0
        booked_hours = await db.scalar(
            select(func.count(BookingSlot.id))
            .join(Booking, Booking.id == BookingSlot.booking_id)
            .where(
                Booking.venue_id == venue.id,
                Booking.created_at >= start,
                Booking.created_at <= end,
                Booking.status.in_([BookingStatus.confirmed, BookingStatus.completed]),
            )
        ) or 0
        revenue = await db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Booking, Booking.id == Payment.booking_id)
            .where(
                Booking.venue_id == venue.id,
                Payment.created_at >= start,
                Payment.created_at <= end,
                Payment.status.in_([PaymentStatus.paid, PaymentStatus.refunded, PaymentStatus.partially_refunded]),
            )
        ) or Decimal("0")
        result.append({
            "venue_id": str(venue.id),
            "venue_name": venue.name,
            "city": venue.city,
            "confirmed_completed_bookings": int(bookings),
            "booked_hours": int(booked_hours),
            "gross_paid": f"{Decimal(revenue):.2f}",
            "currency": "PKR",
        })
    return result
