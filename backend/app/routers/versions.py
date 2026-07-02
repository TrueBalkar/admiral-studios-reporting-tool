from fastapi import APIRouter, HTTPException, Response, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.folder import Folder
from app.models.report import Report, ReportVersion
from app.schemas.report import VersionOut

router = APIRouter(prefix="/api/reports", tags=["versions"])


def _can_edit(report: Report, user_id: str, role: str) -> bool:
    return role == "ADMIN" or report.uploaded_by_id == user_id or report.folder.created_by_id == user_id


@router.get("/{report_id}/versions")
async def list_versions(report_id: str, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(ReportVersion).options(selectinload(ReportVersion.uploaded_by)).where(ReportVersion.report_id == report_id).order_by(ReportVersion.version_num.desc())
    )
    return {"versions": [VersionOut.model_validate(v) for v in result.scalars().all()]}


@router.post("/{report_id}/versions", status_code=status.HTTP_201_CREATED)
async def create_version(report_id: str, user: CurrentUser, db: DbSession, file: UploadFile):
    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")
    if not _can_edit(report, user.user_id, user.role):
        raise HTTPException(status_code=403, detail="Forbidden")

    name = (file.filename or "").lower()
    if not (name.endswith(".html") or name.endswith(".md")):
        raise HTTPException(status_code=400, detail="Only .html and .md files")

    last = await db.scalar(select(func.max(ReportVersion.version_num)).where(ReportVersion.report_id == report_id))
    next_num = (last or 0) + 1

    db.add(ReportVersion(report_id=report_id, version_num=next_num, content=report.content, file_name=report.file_name, uploaded_by_id=user.user_id))

    new_content = (await file.read()).decode("utf-8", errors="replace")
    report.content = new_content
    report.file_name = file.filename or report.file_name

    await db.commit()
    return {"ok": True, "versionNum": next_num}


@router.get("/{report_id}/versions/{version_id}")
async def get_version_content(report_id: str, version_id: str, user: CurrentUser, db: DbSession):
    version = await db.get(ReportVersion, version_id)
    if not version or version.report_id != report_id:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=version.content, media_type="text/html; charset=utf-8")


@router.post("/{report_id}/versions/{version_id}")
async def restore_version(report_id: str, version_id: str, user: CurrentUser, db: DbSession):
    version = await db.get(ReportVersion, version_id)
    if not version or version.report_id != report_id:
        raise HTTPException(status_code=404, detail="Not found")

    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")
    if not _can_edit(report, user.user_id, user.role):
        raise HTTPException(status_code=403, detail="Forbidden")

    last = await db.scalar(select(func.max(ReportVersion.version_num)).where(ReportVersion.report_id == report_id))
    db.add(ReportVersion(report_id=report_id, version_num=(last or 0) + 1, content=report.content, file_name=report.file_name, uploaded_by_id=user.user_id))

    report.content = version.content
    report.file_name = version.file_name
    await db.commit()
    return {"ok": True}
