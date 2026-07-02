from fastapi import APIRouter
from sqlalchemy import func, select, update

from app.core.deps import CurrentUser, DbSession
from app.models.activity import Notification
from app.schemas.notification import NotificationMarkRead, NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user: CurrentUser, db: DbSession):
    result = await db.execute(select(Notification).where(Notification.user_id == user.user_id).order_by(Notification.created_at.desc()).limit(30))
    notifications = result.scalars().all()
    unread = await db.scalar(select(func.count()).select_from(Notification).where(Notification.user_id == user.user_id, Notification.read.is_(False)))
    return {"notifications": [NotificationOut.model_validate(n) for n in notifications], "unread_count": unread or 0}


@router.patch("")
async def mark_read(body: NotificationMarkRead, user: CurrentUser, db: DbSession):
    if body.id == "all":
        await db.execute(update(Notification).where(Notification.user_id == user.user_id, Notification.read.is_(False)).values(read=True))
    else:
        await db.execute(update(Notification).where(Notification.id == body.id, Notification.user_id == user.user_id).values(read=True))
    await db.commit()
    return {"ok": True}
