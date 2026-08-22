from datetime import time
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Court, PricingRule, Venue


async def seed_reference_data(session: AsyncSession) -> None:
    venue_count = await session.scalar(select(func.count()).select_from(Venue))
    if venue_count:
        return

    venue = Venue(
        name="Nishtar Park Sports Complex",
        city="Lahore",
        address="Nishtar Park Sports Complex, Lahore",
        latitude=Decimal("31.5116170"),
        longitude=Decimal("74.3375270"),
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

    # Prototype rates only. Administrators will manage these rules in production.
    for court in courts:
        for start_hour, end_hour, rate in [
            (6, 17, Decimal("1800.00")),
            (17, 19, Decimal("2000.00")),
            (19, 21, Decimal("2200.00")),
            (21, 23, Decimal("2000.00")),
        ]:
            session.add(
                PricingRule(
                    venue_id=venue.id,
                    court_id=court.id,
                    start_time=time(start_hour, 0),
                    end_time=time(end_hour, 0),
                    hourly_rate=rate,
                    priority=100,
                )
            )

    await session.commit()
