from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, Text, Time, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.domain import Base, TimestampMixin


class VenueAssignmentRole(str, enum.Enum):
    manager = "manager"
    operator = "operator"


class BlockType(str, enum.Enum):
    maintenance = "maintenance"
    official_event = "official_event"
    weather = "weather"
    private_closure = "private_closure"
    other = "other"


class UserVenueAssignment(TimestampMixin, Base):
    __tablename__ = "user_venue_assignments"
    __table_args__ = (UniqueConstraint("user_id", "venue_id", name="uq_user_venue_assignment"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    venue_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[VenueAssignmentRole] = mapped_column(Enum(VenueAssignmentRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class VenueBlock(TimestampMixin, Base):
    __tablename__ = "venue_blocks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    venue_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    court_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courts.id", ondelete="CASCADE"), index=True)
    block_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    block_type: Mapped[BlockType] = mapped_column(Enum(BlockType), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BookingCheckIn(TimestampMixin, Base):
    __tablename__ = "booking_checkins"
    __table_args__ = (UniqueConstraint("booking_id", name="uq_booking_checkin"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    venue_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("venues.id"), nullable=False, index=True)
    checked_in_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    checked_in_by_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(String(300))
