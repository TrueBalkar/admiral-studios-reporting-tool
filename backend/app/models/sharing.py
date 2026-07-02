from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, gen_id

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.report import Report


class PublicShareLink(Base, TimestampMixin):
    __tablename__ = "public_share_links"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    token: Mapped[str] = mapped_column(String, unique=True, nullable=False, default=gen_id, index=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    report: Mapped["Report"] = relationship(back_populates="public_links")
    created_by: Mapped["User"] = relationship(back_populates="public_links")
