from datetime import datetime
from typing import Optional

from pydantic import EmailStr

from app.schemas.base import CamelModel


class UserOut(CamelModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime


class UserCreate(CamelModel):
    name: str
    email: EmailStr
    password: str
    role: str = "SALES"


class UserRoleUpdate(CamelModel):
    user_id: str
    role: str


class UserDelete(CamelModel):
    user_id: str


class RoleOut(CamelModel):
    id: str
    name: str
    is_built_in: bool
    is_default: bool


class RoleCreate(CamelModel):
    name: str


class RoleUpdate(CamelModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None


class ProfileUpdate(CamelModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
