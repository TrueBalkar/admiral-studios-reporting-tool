from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.activity import Activity
from app.models.folder import Folder
from app.models.report import Report, ReportView
from app.models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _creator_or_share(f: Folder, user_id: str, role: str) -> bool:
    if f.created_by_id == user_id:
        return True
    return any(
        (s.share_type == "USER" and s.user_id == user_id) or (s.share_type == "ROLE" and s.role_target == role)
        for s in f.shares
    )


@router.get("")
async def get_dashboard(user: CurrentUser, db: DbSession):
    is_admin = user.role == "ADMIN"

    result = await db.execute(
        select(Folder).options(selectinload(Folder.shares), selectinload(Folder.parent).selectinload(Folder.shares))
    )
    all_folders = result.scalars().all()

    if is_admin:
        accessible = all_folders
    else:
        accessible = [f for f in all_folders if _creator_or_share(f, user.user_id, user.role) or (f.parent and _creator_or_share(f.parent, user.user_id, user.role))]
    accessible_ids = [f.id for f in accessible]

    report_count = await db.scalar(select(func.count()).select_from(Report).where(Report.folder_id.in_(accessible_ids))) or 0
    user_count = (await db.scalar(select(func.count()).select_from(User))) if is_admin else None

    recent_result = await db.execute(
        select(Report).options(selectinload(Report.folder), selectinload(Report.uploaded_by))
        .where(Report.folder_id.in_(accessible_ids)).order_by(Report.created_at.desc()).limit(8)
    )
    recent_reports = [
        {
            "id": r.id, "title": r.title, "file_type": r.file_type, "created_at": r.created_at,
            "folder": {"id": r.folder.id, "name": r.folder.name, "type": r.folder.type},
            "uploaded_by": {"name": r.uploaded_by.name},
        }
        for r in recent_result.scalars().all()
    ]

    activity_where = [] if is_admin else [Activity.user_id == user.user_id]
    activity_result = await db.execute(select(Activity).where(*activity_where).order_by(Activity.created_at.desc()).limit(20))
    activity_feed = [
        {"id": a.id, "user_name": a.user_name, "action": a.action, "target_name": a.target_name, "folder_name": a.folder_name, "created_at": a.created_at}
        for a in activity_result.scalars().all()
    ]

    since = datetime.now(timezone.utc) - timedelta(days=365)
    org_result = await db.execute(select(Activity.created_at).where(Activity.created_at >= since))
    my_result = await db.execute(select(Activity.created_at).where(Activity.user_id == user.user_id, Activity.created_at >= since))

    def bucket(rows):
        out: dict[str, int] = {}
        for (dt,) in rows:
            key = dt.date().isoformat()
            out[key] = out.get(key, 0) + 1
        return out

    heatmap = {"org": bucket(org_result.all()), "me": bucket(my_result.all())}

    shared_with_me = [
        f for f in accessible
        if f.created_by_id != user.user_id and any(
            (s.share_type == "USER" and s.user_id == user.user_id) or (s.share_type == "ROLE" and s.role_target == user.role)
            for s in f.shares
        )
    ][:10]

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_report_folders = await db.execute(select(Report.folder_id).where(Report.folder_id.in_(accessible_ids), Report.created_at >= thirty_days_ago))
    active_folder_ids = {fid for (fid,) in recent_report_folders.all()}

    stale_folders = []
    for f in accessible:
        count_n = await db.scalar(select(func.count()).select_from(Report).where(Report.folder_id == f.id))
        if f.created_at < thirty_days_ago and f.id not in active_folder_ids and (count_n or 0) > 0:
            stale_folders.append((f, count_n))
    stale_folders = stale_folders[:5]

    def folder_summary(f: Folder, count: int | None = None):
        return {"id": f.id, "name": f.name, "type": f.type, "color": f.color, "count": {"reports": count if count is not None else 0}}

    accessible_report_ids = await db.execute(select(Report.id).where(Report.folder_id.in_(accessible_ids)))
    accessible_report_ids = [r for (r,) in accessible_report_ids.all()]

    views_result = await db.execute(
        select(ReportView).options(selectinload(ReportView.report).selectinload(Report.folder))
        .where(ReportView.user_id == user.user_id, ReportView.report_id.in_(accessible_report_ids))
        .order_by(ReportView.viewed_at.desc())
    )
    seen = set()
    recently_viewed = []
    for v in views_result.scalars().all():
        if v.report_id in seen:
            continue
        seen.add(v.report_id)
        recently_viewed.append({
            "id": v.report_id, "title": v.report.title, "file_type": v.report.file_type,
            "folder": {"id": v.report.folder.id, "name": v.report.folder.name, "type": v.report.folder.type},
            "viewed_at": v.viewed_at,
        })
        if len(recently_viewed) >= 5:
            break

    return {
        "stats": {"folder_count": len([f for f in accessible if not f.parent_id]), "report_count": report_count, "user_count": user_count},
        "recent_reports": recent_reports,
        "activity_feed": activity_feed,
        "heatmap": heatmap,
        "shared_with_me": [folder_summary(f) for f in shared_with_me],
        "stale_folders": [folder_summary(f, c) for f, c in stale_folders],
        "recently_viewed": recently_viewed,
    }
