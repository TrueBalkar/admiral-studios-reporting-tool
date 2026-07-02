from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.core.deps import DbSession
from app.core.security import verify_password
from app.models.sharing import PublicShareLink
from app.schemas.base import CamelModel

router = APIRouter(prefix="/api/shared", tags=["shared"])


class PasswordBody(CamelModel):
    password: str | None = None


@router.post("/{token}")
async def access_shared(token: str, body: PasswordBody, db: DbSession):
    result = await db.execute(select(PublicShareLink).options(selectinload(PublicShareLink.report)).where(PublicShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Link has expired")

    if link.password:
        if not body.password or not verify_password(body.password, link.password):
            raise HTTPException(status_code=401, detail="Incorrect password")

    await db.execute(update(PublicShareLink).where(PublicShareLink.id == link.id).values(view_count=PublicShareLink.view_count + 1))
    await db.commit()

    return {"title": link.report.title, "fileType": link.report.file_type}


@router.post("/{token}/content")
async def shared_content_post(token: str, body: PasswordBody, db: DbSession):
    result = await db.execute(select(PublicShareLink).options(selectinload(PublicShareLink.report)).where(PublicShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Not found")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Expired")
    if link.password:
        if not body.password or not verify_password(body.password, link.password):
            raise HTTPException(status_code=401, detail="Unauthorized")

    content_type = "text/html" if link.report.file_type == "HTML" else "text/plain"
    return Response(content=link.report.content, media_type=f"{content_type}; charset=utf-8")


@router.get("/{token}/content")
async def shared_content_get(token: str, db: DbSession):
    """For iframe src (HTML only, no password)."""
    result = await db.execute(select(PublicShareLink).options(selectinload(PublicShareLink.report)).where(PublicShareLink.token == token))
    link = result.scalar_one_or_none()
    if not link or link.password:
        raise HTTPException(status_code=404, detail="Not found")
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Expired")

    return Response(content=link.report.content, media_type="text/html; charset=utf-8")
