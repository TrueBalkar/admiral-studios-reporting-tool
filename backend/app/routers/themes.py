from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select, update

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.models.report import Report
from app.models.theme import ReportTheme
from app.schemas.theme import ThemeCreate, ThemeDetailOut, ThemeOut, ThemeUpdate

router = APIRouter(prefix="/api/themes", tags=["themes"])


@router.get("")
async def list_themes(user: CurrentUser, db: DbSession):
    result = await db.execute(select(ReportTheme).order_by(ReportTheme.created_at.asc()))
    return {"themes": [ThemeOut.model_validate(t) for t in result.scalars().all()]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_theme(body: ThemeCreate, admin: AdminUser, db: DbSession):
    if not body.name.strip() or not body.css_content.strip():
        raise HTTPException(status_code=400, detail="Name and CSS required")
    theme = ReportTheme(name=body.name.strip(), description=(body.description or "").strip() or None, css_content=body.css_content)
    db.add(theme)
    await db.commit()
    await db.refresh(theme)
    return {"theme": ThemeOut.model_validate(theme)}


@router.get("/{theme_id}")
async def get_theme(theme_id: str, db: DbSession):
    theme = await db.get(ReportTheme, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Not found")
    return {"theme": ThemeDetailOut.model_validate(theme)}


@router.get("/{theme_id}/css")
async def get_theme_css(theme_id: str, db: DbSession):
    theme = await db.get(ReportTheme, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(content=theme.css_content, media_type="text/css; charset=utf-8", headers={"Cache-Control": "public, max-age=3600"})


@router.put("/{theme_id}")
async def update_theme(theme_id: str, body: ThemeUpdate, admin: AdminUser, db: DbSession):
    theme = await db.get(ReportTheme, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Not found")

    if body.is_default is True:
        await db.execute(update(ReportTheme).where(ReportTheme.is_default.is_(True)).values(is_default=False))

    if body.name:
        theme.name = body.name.strip()
    if body.description is not None:
        theme.description = body.description.strip() or None
    if body.css_content:
        theme.css_content = body.css_content
    if body.is_default is not None:
        theme.is_default = body.is_default

    await db.commit()
    await db.refresh(theme)
    return {"theme": ThemeOut.model_validate(theme)}


@router.delete("/{theme_id}")
async def delete_theme(theme_id: str, admin: AdminUser, db: DbSession):
    theme = await db.get(ReportTheme, theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Not found")

    await db.execute(update(Report).where(Report.theme_id == theme_id).values(theme_id=None))
    await db.delete(theme)
    await db.commit()
    return {"ok": True}
