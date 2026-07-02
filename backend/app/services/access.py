from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.folder import Folder


async def has_access_to_folder(db: AsyncSession, folder_id: str, user_id: str, role: str) -> bool:
    if role == "ADMIN":
        return True

    result = await db.execute(
        select(Folder)
        .options(selectinload(Folder.shares), selectinload(Folder.parent).selectinload(Folder.shares))
        .where(Folder.id == folder_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        return False

    def check(f: Folder) -> bool:
        if f.created_by_id == user_id:
            return True
        for s in f.shares:
            if s.share_type == "USER" and s.user_id == user_id:
                return True
            if s.share_type == "ROLE" and s.role_target == role:
                return True
        return False

    if check(folder):
        return True
    if folder.parent and check(folder.parent):
        return True
    return False
