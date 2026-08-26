"""Add persistent platform settings.

Revision ID: 20260826_0005
Revises: 20260826_0004
Create Date: 2026-08-26
"""

from alembic import op

from app.models import platform as platform_models  # noqa: F401
from app.models.domain import Base

revision = "20260826_0005"
down_revision = "20260826_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.tables["platform_settings"].create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.tables["platform_settings"].drop(bind=bind, checkfirst=True)
