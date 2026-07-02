from fastapi import APIRouter
from sqlalchemy import select, delete as sa_delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.folder import Folder, PinnedFolder
from pydantic import BaseModel

router = APIRouter(prefix="/api/pinned", tags=["pinned"])


class FolderIdBody(BaseModel):
    folder_id: str


@router.get("")
async def list_pinned(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(PinnedFolder)
        .options(
            selectinload(PinnedFolder.folder).selectinload(Folder.created_by),
            selectinload(PinnedFolder.folder).selectinload(Folder.reports),
        )
        .where(PinnedFolder.user_id == user.user_id)
        .order_by(PinnedFolder.created_at.asc())
    )
    pins = result.scalars().all()
    out = []
    for p in pins:
        f = p.folder
        report_count = len(f.reports) if f.reports else 0
        out.append({
            "id": p.id,
            "folder": {
                "id": f.id, "name": f.name, "type": f.type, "color": f.color,
                "count": {"reports": report_count},
                "created_by": {"name": f.created_by.name} if f.created_by else None,
            },
        })
    return {"pinned": out}


@router.post("")
async def pin_folder(body: FolderIdBody, user: CurrentUser, db: DbSession):
    stmt = pg_insert(PinnedFolder).values(user_id=user.user_id, folder_id=body.folder_id)
    stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "folder_id"])
    await db.execute(stmt)
    await db.commit()
    return {"ok": True}


@router.delete("")
async def unpin_folder(body: FolderIdBody, user: CurrentUser, db: DbSession):
    await db.execute(sa_delete(PinnedFolder).where(PinnedFolder.user_id == user.user_id, PinnedFolder.folder_id == body.folder_id))
    await db.commit()
    return {"ok": True}
