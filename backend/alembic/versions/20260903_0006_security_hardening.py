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


def upgrade() -> None:
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")
