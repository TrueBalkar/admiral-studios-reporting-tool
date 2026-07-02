from typing import List, Optional, TYPE_CHECKING
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UpdatedAtMixin, gen_id

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.folder import Folder
    from app.models.theme import ReportTheme, LayoutComponent
    from app.models.sharing import PublicShareLink


class Report(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    title: Mapped[str] = mapped_column(String, nullable=False)
    folder_id: Mapped[str] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    file_type: Mapped[str] = mapped_column(String, nullable=False, default="HTML")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[str] = mapped_column(String, nullable=False, default="")
    styleable: Mapped[bool] = mapped_column(default=False)
    theme_id: Mapped[Optional[str]] = mapped_column(ForeignKey("report_themes.id"), nullable=True)
    header_id: Mapped[Optional[str]] = mapped_column(ForeignKey("layout_components.id"), nullable=True)
    nav_id: Mapped[Optional[str]] = mapped_column(ForeignKey("layout_components.id"), nullable=True)
    footer_id: Mapped[Optional[str]] = mapped_column(ForeignKey("layout_components.id"), nullable=True)

    folder: Mapped["Folder"] = relationship(back_populates="reports")
    uploaded_by: Mapped["User"] = relationship(back_populates="uploaded_reports", foreign_keys=[uploaded_by_id])
    theme: Mapped[Optional["ReportTheme"]] = relationship(foreign_keys=[theme_id])
    header: Mapped[Optional["LayoutComponent"]] = relationship(foreign_keys=[header_id])
    nav: Mapped[Optional["LayoutComponent"]] = relationship(foreign_keys=[nav_id])
    footer: Mapped[Optional["LayoutComponent"]] = relationship(foreign_keys=[footer_id])

    comments: Mapped[List["Comment"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    views: Mapped[List["ReportView"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    versions: Mapped[List["ReportVersion"]] = relationship(back_populates="report", cascade="all, delete-orphan")
    public_links: Mapped[List["PublicShareLink"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class Comment(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship(back_populates="comments")


class ReportView(Base):
    __tablename__ = "report_views"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="report_views")
    report: Mapped["Report"] = relationship(back_populates="views")


class ReportVersion(Base):
    __tablename__ = "report_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    report: Mapped["Report"] = relationship(back_populates="versions")
    uploaded_by: Mapped["User"] = relationship(back_populates="report_versions")
