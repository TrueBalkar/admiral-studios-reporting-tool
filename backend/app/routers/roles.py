from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.models.user import CustomRole, User
from app.schemas.user import RoleCreate, RoleOut, RoleUpdate

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("")
async def list_roles(user: CurrentUser, db: DbSession):
    result = await db.execute(select(CustomRole).order_by(CustomRole.created_at.asc()))
    return {"roles": [RoleOut.model_validate(r) for r in result.scalars().all()]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_role(body: RoleCreate, admin: AdminUser, db: DbSession):
    name = body.name.strip().upper()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    existing = await db.execute(select(CustomRole).where(CustomRole.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role already exists")
    role = CustomRole(name=name)
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return {"role": RoleOut.model_validate(role)}


@router.put("/{role_id}")
async def update_role(role_id: str, body: RoleUpdate, admin: AdminUser, db: DbSession):
    role = await db.get(CustomRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Not found")
    if role.is_built_in:
        raise HTTPException(status_code=400, detail="Cannot edit built-in role")

    if body.is_default is True:
        await db.execute(update(CustomRole).where(CustomRole.is_default.is_(True)).values(is_default=False))

    if body.name:
        role.name = body.name.strip().upper()
    if body.is_default is not None:
        role.is_default = body.is_default

    await db.commit()
    await db.refresh(role)
    return {"role": RoleOut.model_validate(role)}


@router.delete("/{role_id}")
async def delete_role(role_id: str, admin: AdminUser, db: DbSession):
    role = await db.get(CustomRole, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Not found")
    if role.is_built_in:
        raise HTTPException(status_code=400, detail="Cannot delete built-in role")

    default_result = await db.execute(select(CustomRole).where(CustomRole.is_default.is_(True)))
    default_role = default_result.scalar_one_or_none()
    fallback = default_role.name if default_role else "SALES"

    await db.execute(update(User).where(User.role == role.name).values(role=fallback))
    await db.delete(role)
    await db.commit()
    return {"ok": True, "resetTo": fallback}
