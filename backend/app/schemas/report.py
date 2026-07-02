from datetime import datetime
from typing import List, Optional

from app.schemas.base import CamelModel


class UploaderOut(CamelModel):
    id: str
    name: str


class ReportFolderOut(CamelModel):
    id: str
    name: str
    type: str


class ReportOut(CamelModel):
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


class LinkReportCreate(CamelModel):
    title: str
    url: str
    link_kind: str = "LINK"  # FIGMA | GSHEET | LINK


class ReportPatch(CamelModel):
    content: Optional[str] = None
    title: Optional[str] = None
    theme_id: Optional[str] = None
    header_id: Optional[str] = None
    nav_id: Optional[str] = None
    footer_id: Optional[str] = None


class TagsUpdate(CamelModel):
    tags: List[str]


class BulkAction(CamelModel):
    action: str  # delete | move
    report_ids: List[str]
    target_folder_id: Optional[str] = None


class CommentUserOut(CamelModel):
    id: str
    name: str
    role: Optional[str] = None


class CommentOut(CamelModel):
    id: str
    content: str
    created_at: datetime
    user: CommentUserOut


class CommentCreate(CamelModel):
    content: str


class VersionUploaderOut(CamelModel):
    name: str


class VersionOut(CamelModel):
    id: str
    version_num: int
    file_name: str
    created_at: datetime
    uploaded_by: VersionUploaderOut


class PublicLinkOut(CamelModel):
    id: str
    token: str
    expires_at: Optional[datetime] = None
    view_count: int
    has_password: bool
    created_at: datetime


class PublicLinkCreate(CamelModel):
    password: Optional[str] = None
    expires_in_days: Optional[int] = None


class PublicLinkDelete(CamelModel):
    link_id: str


class ViewStatsOut(CamelModel):
    total_views: int
    unique_viewers: int
