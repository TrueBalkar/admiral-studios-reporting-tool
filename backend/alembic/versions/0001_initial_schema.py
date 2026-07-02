"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="SALES"),
        sa.Column("theme", sa.String(), nullable=False, server_default="light"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "custom_roles",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("is_built_in", sa.Boolean(), server_default=sa.false()),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "report_themes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("css_content", sa.Text(), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "layout_components",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("html_template", sa.Text(), nullable=False),
        sa.Column("css_extra", sa.Text(), nullable=False, server_default=""),
        sa.Column("is_default", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("type", "name", name="uq_layout_type_name"),
    )

    op.create_table(
        "folders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False, server_default="CUSTOM"),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("created_by_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("parent_id", sa.String(), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "folder_shares",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("folder_id", sa.String(), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("share_type", sa.String(), nullable=False),
        sa.Column("role_target", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "pinned_folders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("folder_id", sa.String(), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "folder_id", name="uq_pinned_user_folder"),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("folder_id", sa.String(), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("uploaded_by_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(), nullable=False, server_default="HTML"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", sa.String(), nullable=False, server_default=""),
        sa.Column("styleable", sa.Boolean(), server_default=sa.false()),
        sa.Column("theme_id", sa.String(), sa.ForeignKey("report_themes.id"), nullable=True),
        sa.Column("header_id", sa.String(), sa.ForeignKey("layout_components.id"), nullable=True),
        sa.Column("nav_id", sa.String(), sa.ForeignKey("layout_components.id"), nullable=True),
        sa.Column("footer_id", sa.String(), sa.ForeignKey("layout_components.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("report_id", sa.String(), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "report_views",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("report_id", sa.String(), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("viewed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_report_views_user_id", "report_views", ["user_id"])
    op.create_index("ix_report_views_report_id", "report_views", ["report_id"])

    op.create_table(
        "report_versions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("report_id", sa.String(), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_num", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("uploaded_by_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "activities",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_name", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=True),
        sa.Column("target_name", sa.String(), nullable=True),
        sa.Column("folder_id", sa.String(), nullable=True),
        sa.Column("folder_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link", sa.String(), nullable=True),
        sa.Column("read", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "public_share_links",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("token", sa.String(), nullable=False, unique=True),
        sa.Column("report_id", sa.String(), sa.ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
        sa.Column("password", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("view_count", sa.Integer(), server_default="0"),
        sa.Column("created_by_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_public_share_links_token", "public_share_links", ["token"], unique=True)


def downgrade() -> None:
    op.drop_table("public_share_links")
    op.drop_table("notifications")
    op.drop_table("activities")
    op.drop_table("report_versions")
    op.drop_table("report_views")
    op.drop_table("comments")
    op.drop_table("reports")
    op.drop_table("pinned_folders")
    op.drop_table("folder_shares")
    op.drop_table("folders")
    op.drop_table("layout_components")
    op.drop_table("report_themes")
    op.drop_table("custom_roles")
    op.drop_table("users")
