from fastapi import APIRouter, HTTPException, Response

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import ProfileUpdate, UserOut

router = APIRouter(prefix="/api/user", tags=["profile"])


@router.patch("/profile")
async def update_profile(body: ProfileUpdate, user: CurrentUser, response: Response, db: DbSession):
    db_user = await db.get(User, user.user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name and body.name.strip():
        db_user.name = body.name.strip()

    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(body.current_password, db_user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        db_user.password = hash_password(body.new_password)

    await db.commit()
    await db.refresh(db_user)

    token = create_access_token({"user_id": db_user.id, "email": db_user.email, "role": db_user.role, "name": db_user.name})
    response.set_cookie(
        key=settings.cookie_name, value=token, httponly=True, secure=settings.cookie_secure,
        samesite=settings.cookie_samesite, max_age=60 * 60 * 24 * settings.jwt_expire_days, path="/",
    )
    return {"user": UserOut.model_validate(db_user)}
