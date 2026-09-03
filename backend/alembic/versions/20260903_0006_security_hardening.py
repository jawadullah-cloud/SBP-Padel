"""Add token version for immediate session revocation.

Revision ID: 20260903_0006
Revises: 20260826_0005
"""

from alembic import op
import sqlalchemy as sa

revision = "20260903_0006"
down_revision = "20260826_0005"
branch_labels = None
depends_on = None


def _has_token_version() -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(column["name"] == "token_version" for column in inspector.get_columns("users"))


def upgrade() -> None:
    # The historical baseline migration creates its baseline tables from model
    # metadata, so a fresh database can already contain this column once the
    # model has evolved. Existing databases created before security hardening do
    # not. Keep this revision safe for both paths.
    if not _has_token_version():
        op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
        op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    if _has_token_version():
        op.drop_column("users", "token_version")
