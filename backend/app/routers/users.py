from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.core.security import hash_password
from app.models.user import CustomRole, User
from app.schemas.user import UserCreate, UserDelete, UserOut, UserRoleUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
async def list_users(user: CurrentUser, db: DbSession):
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    users = result.scalars().all()
    return {"users": [UserOut.model_validate(u) for u in users]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, admin: AdminUser, db: DbSession):
    if not body.name.strip() or not body.email.strip() or not body.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")

    role = await db.execute(select(CustomRole).where(CustomRole.name == body.role))
    if not role.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    new_user = User(name=body.name.strip(), email=body.email.strip().lower(), password=hash_password(body.password), role=body.role)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"user": UserOut.model_validate(new_user)}


@router.patch("")
async def update_user_role(body: UserRoleUpdate, admin: AdminUser, db: DbSession):
    role = await db.execute(select(CustomRole).where(CustomRole.name == body.role))
    if not role.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid role")

    if body.role != "ADMIN":
        target = await db.get(User, body.user_id)
        if target and target.role == "ADMIN":
            count_result = await db.execute(select(User).where(User.role == "ADMIN"))
            if len(count_result.scalars().all()) <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove role from last admin")

    target = await db.get(User, body.user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Not found")
    target.role = body.role
    await db.commit()
    await db.refresh(target)
    return {"user": UserOut.model_validate(target)}


@router.delete("")
async def delete_user(body: UserDelete, admin: AdminUser, db: DbSession):
    if body.user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    target = await db.get(User, body.user_id)
    if target:
        await db.delete(target)
        await db.commit()
    return {"ok": True}
