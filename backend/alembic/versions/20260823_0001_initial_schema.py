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


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
