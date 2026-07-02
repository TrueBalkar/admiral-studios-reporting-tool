from typing import Optional

from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import TimestampMixin, gen_id


class ReportTheme(Base, TimestampMixin):
    __tablename__ = "report_themes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    css_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class LayoutComponent(Base, TimestampMixin):
    __tablename__ = "layout_components"
    __table_args__ = (UniqueConstraint("type", "name", name="uq_layout_type_name"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    type: Mapped[str] = mapped_column(String, nullable=False)  # HEADER | NAV | FOOTER
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    html_template: Mapped[str] = mapped_column(Text, nullable=False)
    css_extra: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
