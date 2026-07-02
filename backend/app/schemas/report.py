from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class UploaderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str


class ReportFolderOut(BaseModel):
    id: str
    name: str
    type: str


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    file_name: str
    file_type: str
    tags: str
    styleable: bool
    theme_id: Optional[str] = None
    header_id: Optional[str] = None
    nav_id: Optional[str] = None
    footer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    uploaded_by: UploaderOut


class ReportDetailOut(ReportOut):
    folder_id: str
    uploaded_by_id: str
    folder: ReportFolderOut


class LinkReportCreate(BaseModel):
    title: str
    url: str
    link_kind: str = "LINK"  # FIGMA | GSHEET | LINK


class ReportPatch(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    theme_id: Optional[str] = None
    header_id: Optional[str] = None
    nav_id: Optional[str] = None
    footer_id: Optional[str] = None


class TagsUpdate(BaseModel):
    tags: List[str]


class BulkAction(BaseModel):
    action: str  # delete | move
    report_ids: List[str]
    target_folder_id: Optional[str] = None


class CommentUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    role: Optional[str] = None


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    content: str
    created_at: datetime
    user: CommentUserOut


class CommentCreate(BaseModel):
    content: str


class VersionUploaderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str


class VersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    version_num: int
    file_name: str
    created_at: datetime
    uploaded_by: VersionUploaderOut


class PublicLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    token: str
    expires_at: Optional[datetime] = None
    view_count: int
    has_password: bool
    created_at: datetime


class PublicLinkCreate(BaseModel):
    password: Optional[str] = None
    expires_in_days: Optional[int] = None


class PublicLinkDelete(BaseModel):
    link_id: str


class ViewStatsOut(BaseModel):
    total_views: int
    unique_viewers: int
