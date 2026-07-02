from datetime import datetime
from typing import List, Optional

from pydantic import Field

from app.schemas.base import CamelModel


class FolderCreate(CamelModel):
    name: str
    type: str = "CUSTOM"
    description: Optional[str] = None
    parent_id: Optional[str] = None


class FolderUpdate(CamelModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FolderCreatorOut(CamelModel):
    id: str
    name: str
    email: str


class FolderShareUserOut(CamelModel):
    id: str
    name: str
    email: str


class FolderShareOut(CamelModel):
    id: str
    folder_id: str
    share_type: str
    role_target: Optional[str] = None
    user_id: Optional[str] = None
    user: Optional[FolderShareUserOut] = None


class ShareCreate(CamelModel):
    share_type: str  # ROLE | USER
    role_target: Optional[str] = None
    user_id: Optional[str] = None


class ShareDelete(CamelModel):
    share_id: str


class FolderCountOut(CamelModel):
    reports: int
    children: int = 0


class FolderOut(CamelModel):
    id: str
    name: str
    type: str
    description: Optional[str] = None
    color: Optional[str] = None
    created_by_id: str
    parent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[FolderCreatorOut] = None
    shares: List[FolderShareOut] = []
    # Prisma-convention "_count" field name — leading underscore means Pydantic
    # would treat a field literally named "_count" as a private attribute, so
    # the Python field is "count" with an explicit alias override instead.
    count: FolderCountOut = Field(alias="_count")


class FolderChildOut(CamelModel):
    id: str
    name: str
    type: str
    color: Optional[str] = None
    count: FolderCountOut = Field(alias="_count")


class FolderParentOut(CamelModel):
    id: str
    name: str
    color: Optional[str] = None


class FolderDetailOut(FolderOut):
    parent: Optional[FolderParentOut] = None
    children: List[FolderChildOut] = []
