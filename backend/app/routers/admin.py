import csv
import io

from fastapi import APIRouter, Response
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.models.activity import Activity
from app.services.activity import ACTION_LABELS

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/audit")
async def get_audit_log(admin: AdminUser, db: DbSession, page: int = 1, limit: int = 50, action: str = "", user_id: str = "", csv_export: bool = False):
    filters = []
    if action:
        filters.append(Activity.action == action)
    if user_id:
        filters.append(Activity.user_id == user_id)

    if csv_export:
        result = await db.execute(select(Activity).where(*filters).order_by(Activity.created_at.desc()).limit(10000))
        rows = result.scalars().all()
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Date", "User", "Action", "Target", "Folder"])
        for a in rows:
            writer.writerow([a.created_at.isoformat(), a.user_name, ACTION_LABELS.get(a.action, a.action), a.target_name or "", a.folder_name or ""])
        return Response(content=buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="audit-log.csv"'})

    total = await db.scalar(select(func.count()).select_from(Activity).where(*filters)) or 0
    result = await db.execute(select(Activity).where(*filters).order_by(Activity.created_at.desc()).offset((page - 1) * limit).limit(limit))
    items = [
        {"id": a.id, "user_name": a.user_name, "action": a.action, "target_name": a.target_name, "folder_name": a.folder_name, "created_at": a.created_at}
        for a in result.scalars().all()
    ]
    pages = (total + limit - 1) // limit if limit else 1
    return {"items": items, "total": total, "page": page, "pages": max(pages, 1)}
