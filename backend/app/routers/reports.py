from typing import Optional

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.folder import Folder, FolderShare
from app.models.report import Report, ReportView
from app.schemas.report import BulkAction, ReportDetailOut, ReportOut, ReportPatch, TagsUpdate, ViewStatsOut
from app.services.activity import record_activity

router = APIRouter(prefix="/api/reports", tags=["reports"])


async def _load_report_with_access(db: AsyncSession, report_id: str):
    result = await db.execute(
        select(Report)
        .options(
            selectinload(Report.uploaded_by),
            selectinload(Report.folder).selectinload(Folder.shares),
            selectinload(Report.folder).selectinload(Folder.parent).selectinload(Folder.shares),
        )
        .where(Report.id == report_id)
    )
    return result.scalar_one_or_none()


def _check_access(report: Report, user_id: str, role: str) -> bool:
    if role == "ADMIN":
        return True
    folder = report.folder

    def check_folder(f: Folder) -> bool:
        if f.created_by_id == user_id:
            return True
        return any(
            (s.share_type == "USER" and s.user_id == user_id) or (s.share_type == "ROLE" and s.role_target == role)
            for s in f.shares
        )

    if report.uploaded_by_id == user_id or check_folder(folder):
        return True
    if folder.parent and check_folder(folder.parent):
        return True
    return False


@router.get("/{report_id}")
async def get_report(report_id: str, user: CurrentUser, db: DbSession):
    report = await _load_report_with_access(db, report_id)
    if not report or not _check_access(report, user.user_id, user.role):
        raise HTTPException(status_code=404, detail="Not found or forbidden")

    meta = ReportOut.model_validate(report)
    detail = ReportDetailOut(
        **meta.model_dump(), folder_id=report.folder_id, uploaded_by_id=report.uploaded_by_id,
        folder={"id": report.folder.id, "name": report.folder.name, "type": report.folder.type},
    )
    return {"report": detail}


@router.get("/{report_id}/content")
async def get_report_content(report_id: str, user: CurrentUser, db: DbSession):
    report = await _load_report_with_access(db, report_id)
    if not report or not _check_access(report, user.user_id, user.role):
        raise HTTPException(status_code=404, detail="Not found or forbidden")

    content_type = "text/html" if report.file_type == "HTML" else "text/plain"
    return Response(content=report.content, media_type=f"{content_type}; charset=utf-8", headers={"X-Content-Type-Options": "nosniff"})


@router.patch("/{report_id}")
async def patch_report(report_id: str, body: ReportPatch, user: CurrentUser, db: DbSession):
    report = await _load_report_with_access(db, report_id)
    if not report or not _check_access(report, user.user_id, user.role):
        raise HTTPException(status_code=404, detail="Not found or forbidden")

    can_edit = user.role == "ADMIN" or report.uploaded_by_id == user.user_id or report.folder.created_by_id == user.user_id
    if not can_edit:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.content is not None:
        report.content = body.content
    if body.title and body.title.strip():
        report.title = body.title.strip()
    if body.theme_id is not None:
        report.theme_id = body.theme_id or None
    if body.header_id is not None:
        report.header_id = body.header_id or None
    if body.nav_id is not None:
        report.nav_id = body.nav_id or None
    if body.footer_id is not None:
        report.footer_id = body.footer_id or None

    await record_activity(db, user.user_id, user.name, "EDIT_REPORT", target_id=report.id, target_name=report.title, folder_id=report.folder_id, folder_name=report.folder.name)
    await db.commit()

    # Re-query with eager loading rather than db.refresh(), which expires
    # (and would force a lazy-load of) the uploaded_by relationship.
    result = await db.execute(select(Report).options(selectinload(Report.uploaded_by)).where(Report.id == report_id))
    return {"report": ReportOut.model_validate(result.scalar_one())}


@router.delete("/{report_id}")
async def delete_report(report_id: str, user: CurrentUser, db: DbSession):
    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")

    can_delete = user.role == "ADMIN" or report.uploaded_by_id == user.user_id or report.folder.created_by_id == user.user_id
    if not can_delete:
        raise HTTPException(status_code=403, detail="Forbidden")

    await record_activity(db, user.user_id, user.name, "DELETE_REPORT", target_id=report.id, target_name=report.title, folder_id=report.folder_id, folder_name=report.folder.name)
    await db.delete(report)
    await db.commit()
    return {"ok": True}


@router.post("/bulk")
async def bulk_action(body: BulkAction, user: CurrentUser, db: DbSession):
    if not body.report_ids:
        raise HTTPException(status_code=400, detail="No reports selected")

    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id.in_(body.report_ids)))
    reports = result.scalars().all()

    for r in reports:
        can_modify = user.role == "ADMIN" or r.uploaded_by_id == user.user_id or r.folder.created_by_id == user.user_id
        if not can_modify:
            raise HTTPException(status_code=403, detail=f'No permission on "{r.title}"')

    if body.action == "delete":
        await db.execute(sa_delete(Report).where(Report.id.in_(body.report_ids)))
        await db.commit()
        return {"ok": True, "count": len(body.report_ids)}

    if body.action == "move" and body.target_folder_id:
        target = await db.get(Folder, body.target_folder_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target folder not found")
        for r in reports:
            r.folder_id = body.target_folder_id
        await db.commit()
        return {"ok": True, "count": len(body.report_ids)}

    raise HTTPException(status_code=400, detail="Invalid action")


@router.patch("/{report_id}/tags")
async def update_tags(report_id: str, body: TagsUpdate, user: CurrentUser, db: DbSession):
    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")

    can_edit = user.role == "ADMIN" or report.uploaded_by_id == user.user_id or report.folder.created_by_id == user.user_id
    if not can_edit:
        raise HTTPException(status_code=403, detail="Forbidden")

    cleaned = [t.strip().lower().replace(" ", "-") for t in body.tags if t.strip()]
    report.tags = ",".join(cleaned)
    await db.commit()
    return {"tags": cleaned}


@router.get("/{report_id}/views", response_model=ViewStatsOut)
async def get_view_stats(report_id: str, db: DbSession):
    total = await db.scalar(select(func.count()).select_from(ReportView).where(ReportView.report_id == report_id))
    unique = await db.scalar(select(func.count(func.distinct(ReportView.user_id))).where(ReportView.report_id == report_id))
    return ViewStatsOut(total_views=total or 0, unique_viewers=unique or 0)


@router.post("/{report_id}/views")
async def record_view(report_id: str, user: CurrentUser, db: DbSession):
    db.add(ReportView(user_id=user.user_id, report_id=report_id))
    await db.commit()
    return {"ok": True}
