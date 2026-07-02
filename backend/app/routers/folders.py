import base64
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.folder import Folder, FolderShare, PinnedFolder
from app.models.report import Report
from app.models.theme import ReportTheme
from app.schemas.auth import TokenPayload
from app.schemas.folder import (
    FolderCountOut,
    FolderCreate,
    FolderCreatorOut,
    FolderDetailOut,
    FolderOut,
    FolderChildOut,
    FolderParentOut,
    FolderShareOut,
    FolderUpdate,
    ShareCreate,
    ShareDelete,
)
from app.schemas.report import ReportOut
from app.services.access import has_access_to_folder
from app.services.activity import record_activity
from app.services.notifications import notify, notify_role

router = APIRouter(prefix="/api/folders", tags=["folders"])

LINK_KINDS = {"FIGMA", "GSHEET", "LINK"}


def _creator_check(folder: Folder, user_id: str, role: str) -> bool:
    if role == "ADMIN" or folder.created_by_id == user_id:
        return True
    return any(
        (s.share_type == "USER" and s.user_id == user_id) or (s.share_type == "ROLE" and s.role_target == role)
        for s in folder.shares
    )


async def _folder_counts(db: AsyncSession, folder_id: str) -> FolderCountOut:
    reports_n = await db.scalar(select(func.count()).select_from(Report).where(Report.folder_id == folder_id))
    children_n = await db.scalar(select(func.count()).select_from(Folder).where(Folder.parent_id == folder_id))
    return FolderCountOut(reports=reports_n or 0, children=children_n or 0)


async def _to_folder_out(db: AsyncSession, f: Folder) -> FolderOut:
    return FolderOut(
        id=f.id, name=f.name, type=f.type, description=f.description, color=f.color,
        created_by_id=f.created_by_id, parent_id=f.parent_id, created_at=f.created_at, updated_at=f.updated_at,
        created_by=FolderCreatorOut.model_validate(f.created_by) if f.created_by else None,
        shares=[FolderShareOut.model_validate(s) for s in f.shares],
        count=await _folder_counts(db, f.id),
    )


@router.get("")
async def list_folders(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Folder).options(selectinload(Folder.created_by), selectinload(Folder.shares).selectinload(FolderShare.user), selectinload(Folder.parent).selectinload(Folder.shares).selectinload(FolderShare.user))
    )
    all_folders = result.scalars().all()

    if user.role == "ADMIN":
        visible = all_folders
    else:
        visible = [
            f for f in all_folders
            if _creator_check(f, user.user_id, user.role) or (f.parent and _creator_check(f.parent, user.user_id, user.role))
        ]

    out = [await _to_folder_out(db, f) for f in visible]
    out.sort(key=lambda x: x.created_at, reverse=True)
    return {"folders": out}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_folder(body: FolderCreate, user: CurrentUser, db: DbSession):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    if body.parent_id:
        parent = await db.get(Folder, body.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        if parent.parent_id:
            raise HTTPException(status_code=400, detail="Cannot nest more than one level deep")

    folder = Folder(name=body.name.strip(), type=body.type or "CUSTOM", description=(body.description or "").strip() or None, created_by_id=user.user_id, parent_id=body.parent_id)
    db.add(folder)
    await db.flush()

    await record_activity(
        db, user.user_id, user.name, "CREATE_SUBFOLDER" if body.parent_id else "CREATE_FOLDER",
        target_id=folder.id, target_name=folder.name,
    )
    await db.commit()

    result = await db.execute(select(Folder).options(selectinload(Folder.created_by), selectinload(Folder.shares).selectinload(FolderShare.user)).where(Folder.id == folder.id))
    folder = result.scalar_one()
    return {"folder": await _to_folder_out(db, folder)}


@router.get("/{folder_id}")
async def get_folder(folder_id: str, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(Folder)
        .options(
            selectinload(Folder.created_by),
            selectinload(Folder.shares).selectinload(FolderShare.user),
            selectinload(Folder.parent),
            selectinload(Folder.children).selectinload(Folder.created_by),
            selectinload(Folder.children).selectinload(Folder.shares).selectinload(FolderShare.user),
        )
        .where(Folder.id == folder_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")

    ok = await has_access_to_folder(db, folder_id, user.user_id, user.role)
    if not ok:
        raise HTTPException(status_code=403, detail="Forbidden")

    base = await _to_folder_out(db, folder)
    detail = FolderDetailOut(
        **base.model_dump(),
        parent=FolderParentOut(id=folder.parent.id, name=folder.parent.name, color=folder.parent.color) if folder.parent else None,
        children=[FolderChildOut(id=c.id, name=c.name, type=c.type, color=c.color, count=await _folder_counts(db, c.id)) for c in folder.children],
    )
    return {"folder": detail}


@router.put("/{folder_id}")
async def update_folder(folder_id: str, body: FolderUpdate, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role != "ADMIN" and folder.created_by_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.name:
        folder.name = body.name.strip()
    if body.type:
        folder.type = body.type
    if body.description is not None:
        folder.description = body.description.strip() or None
    if body.color is not None:
        folder.color = body.color or None

    await db.commit()
    result = await db.execute(select(Folder).options(selectinload(Folder.created_by), selectinload(Folder.shares).selectinload(FolderShare.user)).where(Folder.id == folder_id))
    folder = result.scalar_one()
    return {"folder": await _to_folder_out(db, folder)}


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role != "ADMIN" and folder.created_by_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await record_activity(db, user.user_id, user.name, "DELETE_FOLDER", target_id=folder.id, target_name=folder.name)
    await db.delete(folder)
    await db.commit()
    return {"ok": True}


# ── Sharing ──────────────────────────────────────────────────────────────

@router.get("/{folder_id}/share")
async def get_shares(folder_id: str, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role != "ADMIN" and folder.created_by_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(select(FolderShare).options(selectinload(FolderShare.user)).where(FolderShare.folder_id == folder_id))
    return {"shares": [FolderShareOut.model_validate(s) for s in result.scalars().all()]}


@router.post("/{folder_id}/share")
async def add_share(folder_id: str, body: ShareCreate, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role != "ADMIN" and folder.created_by_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.share_type == "ROLE" and body.role_target:
        existing = await db.execute(select(FolderShare).where(FolderShare.folder_id == folder_id, FolderShare.share_type == "ROLE", FolderShare.role_target == body.role_target))
        if not existing.scalar_one_or_none():
            db.add(FolderShare(folder_id=folder_id, share_type="ROLE", role_target=body.role_target))
            await db.flush()
            await notify_role(db, body.role_target, "FOLDER_SHARED", "Folder shared with you", f'"{folder.name}" is now accessible to {body.role_target}', f"/folders/{folder.id}", exclude_user_id=user.user_id)
    elif body.share_type == "USER" and body.user_id:
        existing = await db.execute(select(FolderShare).where(FolderShare.folder_id == folder_id, FolderShare.share_type == "USER", FolderShare.user_id == body.user_id))
        if not existing.scalar_one_or_none():
            db.add(FolderShare(folder_id=folder_id, share_type="USER", user_id=body.user_id))
            await db.flush()
            if body.user_id != user.user_id:
                await notify(db, body.user_id, "FOLDER_SHARED", "Folder shared with you", f'{user.name} shared "{folder.name}" with you', f"/folders/{folder.id}")
    else:
        raise HTTPException(status_code=400, detail="Invalid share target")

    await db.commit()
    result = await db.execute(select(FolderShare).options(selectinload(FolderShare.user)).where(FolderShare.folder_id == folder_id))
    return {"shares": [FolderShareOut.model_validate(s) for s in result.scalars().all()]}


@router.delete("/{folder_id}/share")
async def remove_share(folder_id: str, body: ShareDelete, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role != "ADMIN" and folder.created_by_id != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    share = await db.get(FolderShare, body.share_id)
    if share:
        await db.delete(share)
        await db.commit()
    return {"ok": True}


# ── Reports (nested under a folder) ─────────────────────────────────────

@router.get("/{folder_id}/reports")
async def list_reports(folder_id: str, user: CurrentUser, db: DbSession):
    ok = await has_access_to_folder(db, folder_id, user.user_id, user.role)
    if not ok:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(Report).options(selectinload(Report.uploaded_by)).where(Report.folder_id == folder_id).order_by(Report.created_at.desc())
    )
    return {"reports": [ReportOut.model_validate(r) for r in result.scalars().all()]}


@router.post("/{folder_id}/reports", status_code=status.HTTP_201_CREATED)
async def create_report(folder_id: str, request: Request, user: CurrentUser, db: DbSession):
    folder = await db.get(Folder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Not found")

    ok = await has_access_to_folder(db, folder_id, user.user_id, user.role)
    if not ok:
        raise HTTPException(status_code=403, detail="Forbidden")

    content_type = request.headers.get("content-type", "")
    styleable = False
    theme_id: Optional[str] = None

    if "application/json" in content_type:
        body = await request.json()
        title = (body.get("title") or "").strip()
        url = (body.get("url") or "").strip()
        kind = (body.get("link_kind") or "LINK").upper()
        if not title or not url:
            raise HTTPException(status_code=400, detail="Title and URL are required")
        if not (url.startswith("http://") or url.startswith("https://")):
            raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
        if kind not in LINK_KINDS:
            raise HTTPException(status_code=400, detail="Invalid link type")
        file_type = kind
        content = url
        try:
            from urllib.parse import urlparse
            file_name = urlparse(url).hostname or url
        except Exception:
            file_name = url
    else:
        form = await request.form()
        title = str(form.get("title") or "").strip()
        file: Optional[UploadFile] = form.get("file")  # type: ignore[assignment]
        if not title or not file:
            raise HTTPException(status_code=400, detail="Title and file are required")

        name = file.filename.lower() if file.filename else ""
        is_html = name.endswith(".html") or file.content_type == "text/html"
        is_md = name.endswith(".md") or file.content_type == "text/markdown"
        is_xlsx = name.endswith(".xlsx") or name.endswith(".xls") or file.content_type in (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
        )
        if not (is_html or is_md or is_xlsx):
            raise HTTPException(status_code=400, detail="Only .html, .md, and .xlsx files are allowed")

        file_name = file.filename or "upload"
        raw = await file.read()
        if is_xlsx:
            file_type = "XLSX"
            content = base64.b64encode(raw).decode()
        else:
            file_type = "MD" if is_md else "HTML"
            content = raw.decode("utf-8", errors="replace")

        styleable_field = form.get("styleable")
        styleable = styleable_field in ("true", "1")
        if styleable and file_type == "HTML":
            theme_result = await db.execute(select(ReportTheme).where(ReportTheme.is_default.is_(True)))
            default_theme = theme_result.scalar_one_or_none()
            if default_theme:
                theme_id = default_theme.id

    report = Report(
        title=title, folder_id=folder_id, uploaded_by_id=user.user_id, file_name=file_name,
        file_type=file_type, content=content, styleable=styleable, theme_id=theme_id,
    )
    db.add(report)
    await db.flush()

    await record_activity(db, user.user_id, user.name, "UPLOAD_REPORT", target_id=report.id, target_name=report.title, folder_id=folder_id, folder_name=folder.name)
    await db.commit()

    result = await db.execute(select(Report).options(selectinload(Report.uploaded_by)).where(Report.id == report.id))
    return {"report": ReportOut.model_validate(result.scalar_one())}
