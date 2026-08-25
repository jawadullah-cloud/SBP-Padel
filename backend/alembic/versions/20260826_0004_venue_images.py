"""Add venue image gallery.

Revision ID: 20260826_0004
Revises: 20260825_0003
"""
import sqlalchemy as sa
from alembic import op
revision="20260826_0004"
down_revision="20260825_0003"
branch_labels=None
depends_on=None

def upgrade()->None:
    op.create_table("venue_images",
        sa.Column("id",sa.Uuid(),primary_key=True,nullable=False),
        sa.Column("venue_id",sa.Uuid(),sa.ForeignKey("venues.id",ondelete="CASCADE"),nullable=False),
        sa.Column("image_data_url",sa.Text(),nullable=False),
        sa.Column("caption",sa.String(length=180)),
        sa.Column("position",sa.Integer(),nullable=False,server_default="0"),
        sa.Column("is_cover",sa.Boolean(),nullable=False,server_default=sa.false()),
        sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
        sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False),
        sa.UniqueConstraint("venue_id","position",name="uq_venue_image_position"))
    op.create_index("ix_venue_images_venue_id","venue_images",["venue_id"])

def downgrade()->None:
    op.drop_index("ix_venue_images_venue_id",table_name="venue_images")
    op.drop_table("venue_images")
