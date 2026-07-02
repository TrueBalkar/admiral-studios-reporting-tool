from pydantic import BaseModel, EmailStr


class TokenPayload(BaseModel):
    user_id: str
    email: str
    role: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    user: UserPublic
