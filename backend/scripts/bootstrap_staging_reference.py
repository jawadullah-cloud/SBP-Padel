from __future__ import annotations

import asyncio
import os
from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings, validate_runtime_settings
from app.db.session import SessionLocal
from app.models.domain import Court, PolicyVersion, PricingRule, Venue

CONFIRMATION = "SBP_PADEL_STAGING_REFERENCE_ONLY"
VENUE_NAME = "Nishtar Park Sports Complex"
POLICY_VERSION = "2026-staging-uat-1"


async def bootstrap() -> None:
    validate_runtime_settings(settings)
    if settings.environment.strip().lower() != "staging":
        raise RuntimeError("This bootstrap may run only with ENVIRONMENT=staging.")
    if os.getenv("SBP_PADEL_STAGING_BOOTSTRAP_CONFIRM", "") != CONFIRMATION:
        raise RuntimeError("Explicit staging bootstrap confirmation is required.")

    async with SessionLocal() as session:
        venue = await session.scalar(select(Venue).where(Venue.name == VENUE_NAME))
        if venue is None:
            venue = Venue(
                name=VENUE_NAME,
                city="Lahore",
                address="Nishtar Park Sports Complex, Lahore",
                latitude=Decimal("31.5116170"),
                longitude=Decimal("74.3375270"),
                timezone="Asia/Karachi",
                description=(
                    "Sports Board Punjab Padel staging/UAT reference facility. "
                    "Operational details must be reviewed before production use."
                ),
                amenities=["Floodlights", "Parking", "Cafeteria", "Changing", "Seating"],
                opening_time=time(6, 0),
                closing_time=time(23, 0),
                is_active=True,
            )
            session.add(venue)
            await session.flush()
            print(f"Created staging reference venue: {VENUE_NAME}")
        else:
            print(f"Staging reference venue already exists: {VENUE_NAME}")

        court_specs = [
            ("01", "Court 01", "Championship Court"),
            ("02", "Court 02", "Training Court"),
            ("03", "Court 03", "Training Court"),
            ("04", "Court 04", "Training Court"),
            ("05", "Court 05", "Training Court"),
        ]
        for code, name, court_type in court_specs:
            court = await session.scalar(
                select(Court).where(Court.venue_id == venue.id, Court.code == code)
            )
            if court is None:
                court = Court(
                    venue_id=venue.id,
                    code=code,
                    name=name,
                    court_type=court_type,
                )
                session.add(court)
                await session.flush()
                print(f"Created staging reference court: {code}")

            existing_rule = await session.scalar(
                select(PricingRule.id).where(
                    PricingRule.venue_id == venue.id,
                    PricingRule.court_id == court.id,
                ).limit(1)
            )
            if existing_rule is None:
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
                            is_active=True,
                        )
                    )
                print(f"Created staging reference pricing for court: {code}")

        policy = await session.scalar(
            select(PolicyVersion).where(PolicyVersion.version == POLICY_VERSION)
        )
        if policy is None:
            existing_active = await session.scalar(
                select(PolicyVersion.id).where(PolicyVersion.is_active.is_(True)).limit(1)
            )
            policy = PolicyVersion(
                version=POLICY_VERSION,
                title="SBP Padel Staging/UAT Booking Policy",
                body=(
                    "STAGING/UAT ONLY — not an approved production policy. "
                    "This temporary policy exists solely to exercise booking workflows in the "
                    "SBP-Padel staging environment. Final cancellation, refund, rescheduling and "
                    "venue-operation rules remain subject to Sports Board Punjab approval."
                ),
                effective_from=datetime.now(timezone.utc),
                is_active=existing_active is None,
            )
            session.add(policy)
            print("Created clearly marked staging/UAT policy.")

        await session.commit()

    print("Staging reference-data bootstrap complete. No users or credentials were created.")


if __name__ == "__main__":
    asyncio.run(bootstrap())
