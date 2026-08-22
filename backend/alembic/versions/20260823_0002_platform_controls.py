"""Add audit logs and reconciliation batches.

Revision ID: 20260823_0002
Revises: 20260823_0001
Create Date: 2026-08-23
"""

from alembic import op

from app.models import platform as platform_models  # noqa: F401
from app.models.domain import Base

revision = "20260823_0002"
down_revision = "20260823_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    for table_name in ("audit_logs", "reconciliation_batches"):
        Base.metadata.tables[table_name].create(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    for table_name in ("reconciliation_batches", "audit_logs"):
        Base.metadata.tables[table_name].drop(bind=bind, checkfirst=True)
