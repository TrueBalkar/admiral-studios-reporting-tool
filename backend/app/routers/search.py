from fastapi import APIRouter
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.folder import Folder
from app.models.report import Report

router = APIRouter(prefix="/api/search", tags=["search"])


def _accessible(f: Folder, user_id: str, role: str) -> bool:
    if f.created_by_id == user_id:
        return True
    return any(
        (s.share_type == "USER" and s.user_id == user_id) or (s.share_type == "ROLE" and s.role_target == role)
        for s in f.shares
    )


@router.get("")
async def search(q: str, user: CurrentUser, db: DbSession):
    q = q.strip()
    if not q:
        return {"folders": [], "reports": []}

    is_admin = user.role == "ADMIN"
    result = await db.execute(select(Folder).options(selectinload(Folder.shares), selectinload(Folder.parent).selectinload(Folder.shares)))
    all_folders = result.scalars().all()

    if is_admin:
        accessible = all_folders
    else:
        accessible = [f for f in all_folders if _accessible(f, user.user_id, user.role) or (f.parent and _accessible(f.parent, user.user_id, user.role))]

    like = f"%{q}%"
    matched_folders = [f for f in accessible if q.lower() in f.name.lower() or (f.description and q.lower() in f.description.lower())][:10]

    accessible_ids = [f.id for f in accessible]
    report_result = await db.execute(
        select(Report).options(selectinload(Report.folder), selectinload(Report.uploaded_by))
        .where(
            Report.folder_id.in_(accessible_ids),
            or_(Report.title.ilike(like), Report.file_name.ilike(like), Report.tags.ilike(like), Report.content.ilike(like)),
        )
        .limit(15)
    )

    return {
        "folders": [{"id": f.id, "name": f.name, "type": f.type, "count": {"reports": 0}} for f in matched_folders],
        "reports": [
            {"id": r.id, "title": r.title, "folder": {"id": r.folder.id, "name": r.folder.name, "type": r.folder.type}, "uploaded_by": {"name": r.uploaded_by.name}}
            for r in report_result.scalars().all()
        ],
    }
