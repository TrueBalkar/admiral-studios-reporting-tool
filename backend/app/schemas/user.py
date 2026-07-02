from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    created_at: datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "SALES"


class UserRoleUpdate(BaseModel):
    user_id: str
    role: str


class UserDelete(BaseModel):
    user_id: str


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    is_built_in: bool
    is_default: bool


class RoleCreate(BaseModel):
    name: str


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    is_default: Optional[bool] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
