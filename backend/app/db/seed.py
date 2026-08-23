from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.domain import Court, PolicyVersion, PricingRule, User, UserRole, Venue
from app.models.operations import UserVenueAssignment, VenueAssignmentRole


async def seed_reference_data(session: AsyncSession) -> None:
    venue_count = await session.scalar(select(func.count()).select_from(Venue))
    if not venue_count:
        venue = Venue(
            name="Nishtar Park Sports Complex",
            city="Lahore",
            address="Nishtar Park Sports Complex, Lahore",
            latitude=Decimal("31.5116170"),
            longitude=Decimal("74.3375270"),
            timezone="Asia/Karachi",
            description="Sports Board Punjab Padel facility with one championship court and four training courts.",
            amenities=["Floodlights", "Parking", "Cafeteria", "Changing", "Seating"],
            opening_time=time(6, 0),
            closing_time=time(23, 0),
        )
        session.add(venue)
        await session.flush()
        courts = [
            Court(venue_id=venue.id, code="01", name="Court 01", court_type="Championship Court"),
            Court(venue_id=venue.id, code="02", name="Court 02", court_type="Training Court"),
            Court(venue_id=venue.id, code="03", name="Court 03", court_type="Training Court"),
            Court(venue_id=venue.id, code="04", name="Court 04", court_type="Training Court"),
            Court(venue_id=venue.id, code="05", name="Court 05", court_type="Training Court"),
        ]
        session.add_all(courts)
        await session.flush()
        for court in courts:
            for start_hour, end_hour, rate in [(6, 17, Decimal("1800.00")), (17, 19, Decimal("2000.00")), (19, 21, Decimal("2200.00")), (21, 23, Decimal("2000.00"))]:
                session.add(PricingRule(venue_id=venue.id, court_id=court.id, start_time=time(start_hour, 0), end_time=time(end_hour, 0), hourly_rate=rate, priority=100))
    else:
        venue = await session.scalar(select(Venue).where(Venue.name == "Nishtar Park Sports Complex"))
        if venue and venue.timezone != "Asia/Karachi":
            venue.timezone = "Asia/Karachi"

    if not await session.scalar(select(PolicyVersion.id).limit(1)):
        session.add(PolicyVersion(version="2026-draft-1", title="SBP Padel Booking, Cancellation & Refund Policy", body="Prototype policy for system development. A booking is confirmed only after successful payment. Players should arrive before their booked session. Cancellation, refund and rescheduling eligibility will be governed by the final Sports Board Punjab approved policy. Venue-side closure may result in rescheduling, wallet credit or refund according to the approved rules.", effective_from=datetime.now(timezone.utc), is_active=True))

    async def ensure_user(email: str, name: str, password: str, role: UserRole) -> User:
        user = await session.scalar(select(User).where(User.email == email))
        if not user:
            user = User(full_name=name, email=email, password_hash=hash_password(password), role=role)
            session.add(user)
            await session.flush()
        return user

    await ensure_user("player@sbppadel.local", "Demo Player", "PadelDemo2026!", UserRole.player)
    await ensure_user("admin@sbppadel.local", "SBP Padel Administrator", "PadelAdmin2026!", UserRole.admin)
    manager = await ensure_user("manager@sbppadel.local", "Nishtar Park Venue Manager", "PadelManager2026!", UserRole.venue_manager)
    operator = await ensure_user("operator@sbppadel.local", "Nishtar Park Venue Operator", "PadelOperator2026!", UserRole.venue_operator)

    if venue:
        for user, role in [(manager, VenueAssignmentRole.manager), (operator, VenueAssignmentRole.operator)]:
            exists = await session.scalar(select(UserVenueAssignment.id).where(UserVenueAssignment.user_id == user.id, UserVenueAssignment.venue_id == venue.id))
            if not exists:
                session.add(UserVenueAssignment(user_id=user.id, venue_id=venue.id, role=role, is_active=True))

    await session.commit()
