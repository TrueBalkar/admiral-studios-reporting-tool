from typing import Optional

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.models.report import Report
from app.models.theme import LayoutComponent
from app.schemas.theme import LayoutCreate, LayoutDetailOut, LayoutOut, LayoutUpdate

router = APIRouter(prefix="/api/layouts", tags=["layouts"])

VALID_TYPES = {"HEADER", "NAV", "FOOTER"}
FIELD_BY_TYPE = {"HEADER": Report.header_id, "NAV": Report.nav_id, "FOOTER": Report.footer_id}


@router.get("")
async def list_layouts(user: CurrentUser, db: DbSession, type: Optional[str] = None):
    stmt = select(LayoutComponent)
    if type:
        stmt = stmt.where(LayoutComponent.type == type.upper())
    stmt = stmt.order_by(LayoutComponent.type.asc(), LayoutComponent.created_at.asc())
    result = await db.execute(stmt)
    return {"layouts": [LayoutOut.model_validate(l) for l in result.scalars().all()]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_layout(body: LayoutCreate, admin: AdminUser, db: DbSession):
    layout_type = body.type.upper()
    if layout_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {', '.join(VALID_TYPES)}")
    if not body.name.strip() or not body.html_template.strip():
        raise HTTPException(status_code=400, detail="Name and htmlTemplate are required")

    layout = LayoutComponent(type=layout_type, name=body.name.strip(), description=(body.description or "").strip() or None, html_template=body.html_template, css_extra=body.css_extra or "")
    db.add(layout)
    await db.commit()
    await db.refresh(layout)
    return {"layout": LayoutOut.model_validate(layout)}


@router.get("/{layout_id}")
async def get_layout(layout_id: str, db: DbSession):
    layout = await db.get(LayoutComponent, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Not found")
    return {"layout": LayoutDetailOut.model_validate(layout)}


@router.put("/{layout_id}")
async def update_layout(layout_id: str, body: LayoutUpdate, admin: AdminUser, db: DbSession):
    layout = await db.get(LayoutComponent, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Not found")

    if body.is_default is True:
        await db.execute(update(LayoutComponent).where(LayoutComponent.type == layout.type, LayoutComponent.is_default.is_(True)).values(is_default=False))

    if body.name:
        layout.name = body.name.strip()
    if body.description is not None:
        layout.description = body.description.strip() or None
    if body.html_template:
        layout.html_template = body.html_template
    if body.css_extra is not None:
        layout.css_extra = body.css_extra or ""
    if body.is_default is not None:
        layout.is_default = body.is_default

    await db.commit()
    await db.refresh(layout)
    return {"layout": LayoutOut.model_validate(layout)}


@router.delete("/{layout_id}")
async def delete_layout(layout_id: str, admin: AdminUser, db: DbSession):
    layout = await db.get(LayoutComponent, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Not found")

    field = FIELD_BY_TYPE.get(layout.type)
    if field is not None:
        await db.execute(update(Report).where(field == layout_id).values(**{field.key: None}))

    await db.delete(layout)
    await db.commit()
    return {"ok": True}
