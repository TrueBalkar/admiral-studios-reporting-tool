from pydantic import EmailStr

from app.schemas.base import CamelModel


class TokenPayload(CamelModel):
    user_id: str
    email: str
    role: str
    name: str


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class UserPublic(CamelModel):
    id: str
    name: str
    email: str
    role: str


class LoginResponse(CamelModel):
    user: UserPublic
