from typing import Annotated, Optional

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.schemas.auth import TokenPayload

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    auth_token: Annotated[Optional[str], Cookie(alias=settings.cookie_name)] = None,
) -> TokenPayload:
    """Reads the JWT from the httpOnly cookie (cookie name = settings.cookie_name, default 'auth-token')."""
    if not auth_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    payload = decode_access_token(auth_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    # payload uses camelCase claim names (userId, email, role, name) — TokenPayload's
    # alias_generator maps "userId" -> the user_id field. Extra claims (e.g. "exp")
    # are silently ignored (Pydantic's default extra="ignore").
    return TokenPayload(**payload)


CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]


async def require_admin(user: CurrentUser) -> TokenPayload:
    if user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return user


AdminUser = Annotated[TokenPayload, Depends(require_admin)]
