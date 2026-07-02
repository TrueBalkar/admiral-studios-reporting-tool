from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class FolderCreate(BaseModel):
    name: str
    type: str = "CUSTOM"
    description: Optional[str] = None
    parent_id: Optional[str] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class FolderCreatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str


class FolderShareUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str


class FolderShareOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    folder_id: str
    share_type: str
    role_target: Optional[str] = None
    user_id: Optional[str] = None
    user: Optional[FolderShareUserOut] = None


class ShareCreate(BaseModel):
    share_type: str  # ROLE | USER
    role_target: Optional[str] = None
    user_id: Optional[str] = None


class ShareDelete(BaseModel):
    share_id: str


class FolderCountOut(BaseModel):
    reports: int
    children: int


class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
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
    count: FolderCountOut


class FolderChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    color: Optional[str] = None
    count: FolderCountOut


class FolderParentOut(BaseModel):
    id: str
    name: str
    color: Optional[str] = None


class FolderDetailOut(FolderOut):
    parent: Optional[FolderParentOut] = None
    children: List[FolderChildOut] = []
