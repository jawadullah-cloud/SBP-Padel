"""Initial SBP Padel schema.

Revision ID: 20260823_0001
Revises:
Create Date: 2026-08-23
"""

from alembic import op

from app.models import operations as operations_models  # noqa: F401
from app.models.domain import Base

revision = "20260823_0001"
down_revision = None
branch_labels = None
depends_on = None

# Migration history must be immutable. Do not let future model additions leak
# into this baseline through Base.metadata.create_all(). Tables introduced by
# later revisions (platform controls, booking participants, venue images, etc.)
# intentionally do not appear here.
BASELINE_TABLES = (
    "users",
    "user_profiles",
    "venues",
    "courts",
    "pricing_rules",
    "policy_versions",
    "bookings",
    "booking_slots",
    "payments",
    "refunds",
    "notifications",
    "user_venue_assignments",
    "venue_blocks",
    "booking_checkins",
)


def upgrade() -> None:
    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in BASELINE_TABLES]
    Base.metadata.create_all(bind=bind, tables=tables)


def downgrade() -> None:
    bind = op.get_bind()
    tables = [Base.metadata.tables[name] for name in reversed(BASELINE_TABLES)]
    Base.metadata.drop_all(bind=bind, tables=tables)
