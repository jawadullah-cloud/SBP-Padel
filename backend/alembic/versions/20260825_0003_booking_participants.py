"""Add booking participants.

Revision ID: 20260825_0003
Revises: 20260823_0002
Create Date: 2026-08-25
"""

import sqlalchemy as sa
from alembic import op

revision = "20260825_0003"
down_revision = "20260823_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "booking_participants",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("booking_id", sa.Uuid(), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("booking_id", "position", name="uq_booking_participant_position"),
    )
    op.create_index("ix_booking_participants_booking_id", "booking_participants", ["booking_id"])


def downgrade() -> None:
    op.drop_index("ix_booking_participants_booking_id", table_name="booking_participants")
    op.drop_table("booking_participants")
