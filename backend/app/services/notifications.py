from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Notification
from app.models.user import User


async def notify(
    db: AsyncSession, user_id: str, type: str, title: str, body: Optional[str] = None, link: Optional[str] = None
) -> None:
    db.add(Notification(user_id=user_id, type=type, title=title, body=body, link=link))
    await db.flush()


async def notify_role(
    db: AsyncSession,
    role: str,
    type: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
    exclude_user_id: Optional[str] = None,
) -> None:
    stmt = select(User.id).where(User.role == role)
    if exclude_user_id:
        stmt = stmt.where(User.id != exclude_user_id)
    result = await db.execute(stmt)
    for (uid,) in result.all():
        db.add(Notification(user_id=uid, type=type, title=title, body=body, link=link))
    await db.flush()
