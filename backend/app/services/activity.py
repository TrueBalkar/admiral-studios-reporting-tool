from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity

ACTION_LABELS = {
    "UPLOAD_REPORT": "uploaded",
    "CREATE_FOLDER": "created folder",
    "CREATE_SUBFOLDER": "created subfolder",
    "SHARE_FOLDER": "shared folder",
    "DELETE_REPORT": "deleted report",
    "DELETE_FOLDER": "deleted folder",
    "EDIT_REPORT": "edited",
}


async def record_activity(
    db: AsyncSession,
    user_id: str,
    user_name: str,
    action: str,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    folder_id: Optional[str] = None,
    folder_name: Optional[str] = None,
) -> None:
    db.add(
        Activity(
            user_id=user_id,
            user_name=user_name,
            action=action,
            target_id=target_id,
            target_name=target_name,
            folder_id=folder_id,
            folder_name=folder_name,
        )
    )
    await db.flush()
