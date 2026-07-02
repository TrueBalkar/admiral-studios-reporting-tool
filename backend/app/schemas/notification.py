from datetime import datetime
from typing import Optional

from app.schemas.base import CamelModel


class NotificationOut(CamelModel):
    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    read: bool
    created_at: datetime


class NotificationMarkRead(CamelModel):
    id: str  # notification id, or the literal "all"
