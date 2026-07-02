from typing import List, TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, gen_id

if TYPE_CHECKING:
    from app.models.folder import Folder, FolderShare, PinnedFolder
    from app.models.report import Comment, Report, ReportVersion, ReportView
    from app.models.activity import Activity, Notification
    from app.models.sharing import PublicShareLink


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default="SALES")
    theme: Mapped[str] = mapped_column(String, nullable=False, default="light")

    created_folders: Mapped[List["Folder"]] = relationship(back_populates="created_by", foreign_keys="Folder.created_by_id")
    uploaded_reports: Mapped[List["Report"]] = relationship(back_populates="uploaded_by", foreign_keys="Report.uploaded_by_id")
    shared_folders: Mapped[List["FolderShare"]] = relationship(back_populates="user")
    pinned_folders: Mapped[List["PinnedFolder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    activities: Mapped[List["Activity"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    comments: Mapped[List["Comment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    report_views: Mapped[List["ReportView"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    report_versions: Mapped[List["ReportVersion"]] = relationship(back_populates="uploaded_by")
    public_links: Mapped[List["PublicShareLink"]] = relationship(back_populates="created_by")


class CustomRole(Base, TimestampMixin):
    __tablename__ = "custom_roles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_built_in: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
