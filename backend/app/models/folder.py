from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UpdatedAtMixin, gen_id

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.report import Report


class Folder(Base, TimestampMixin, UpdatedAtMixin):
    __tablename__ = "folders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False, default="CUSTOM")
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)

    created_by: Mapped["User"] = relationship(back_populates="created_folders", foreign_keys=[created_by_id])
    parent: Mapped[Optional["Folder"]] = relationship(remote_side=[id], back_populates="children")
    children: Mapped[List["Folder"]] = relationship(back_populates="parent", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship(back_populates="folder", cascade="all, delete-orphan")
    shares: Mapped[List["FolderShare"]] = relationship(back_populates="folder", cascade="all, delete-orphan")
    pinned_by: Mapped[List["PinnedFolder"]] = relationship(back_populates="folder", cascade="all, delete-orphan")


class FolderShare(Base, TimestampMixin):
    __tablename__ = "folder_shares"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    folder_id: Mapped[str] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    share_type: Mapped[str] = mapped_column(String, nullable=False)  # ROLE | USER
    role_target: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    folder: Mapped["Folder"] = relationship(back_populates="shares")
    user: Mapped[Optional["User"]] = relationship(back_populates="shared_folders")


class PinnedFolder(Base, TimestampMixin):
    __tablename__ = "pinned_folders"
    __table_args__ = (UniqueConstraint("user_id", "folder_id", name="uq_pinned_user_folder"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    folder_id: Mapped[str] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="pinned_folders")
    folder: Mapped["Folder"] = relationship(back_populates="pinned_by")
