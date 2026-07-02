from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.core.security import hash_password
from app.models.report import Report
from app.models.sharing import PublicShareLink
from app.schemas.report import PublicLinkCreate, PublicLinkDelete, PublicLinkOut

router = APIRouter(prefix="/api/reports", tags=["public-links"])


def _to_out(link: PublicShareLink) -> PublicLinkOut:
    return PublicLinkOut(
        id=link.id, token=link.token, expires_at=link.expires_at, view_count=link.view_count,
        has_password=bool(link.password), created_at=link.created_at,
    )


@router.get("/{report_id}/public-link")
async def list_links(report_id: str, user: CurrentUser, db: DbSession):
    result = await db.execute(select(PublicShareLink).where(PublicShareLink.report_id == report_id).order_by(PublicShareLink.created_at.desc()))
    return {"links": [_to_out(l) for l in result.scalars().all()]}


@router.post("/{report_id}/public-link", status_code=status.HTTP_201_CREATED)
async def create_link(report_id: str, body: PublicLinkCreate, user: CurrentUser, db: DbSession):
    result = await db.execute(select(Report).options(selectinload(Report.folder)).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Not found")

    can_share = user.role == "ADMIN" or report.uploaded_by_id == user.user_id or report.folder.created_by_id == user.user_id
    if not can_share:
        raise HTTPException(status_code=403, detail="Forbidden")

    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    link = PublicShareLink(
        report_id=report_id, created_by_id=user.user_id,
        password=hash_password(body.password) if body.password else None,
        expires_at=expires_at,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return {"token": link.token, "link": f"/shared/{link.token}"}


@router.delete("/{report_id}/public-link")
async def delete_link(report_id: str, body: PublicLinkDelete, user: CurrentUser, db: DbSession):
    link = await db.get(PublicShareLink, body.link_id)
    if link and link.report_id == report_id:
        await db.delete(link)
        await db.commit()
    return {"ok": True}
