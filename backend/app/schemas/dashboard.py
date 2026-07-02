from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class StatsOut(BaseModel):
    folder_count: int
    report_count: int
    user_count: Optional[int] = None


class RecentReportOut(BaseModel):
    id: str
    title: str
    file_type: str
    created_at: datetime
    folder: dict
    uploaded_by: dict


class ActivityFeedItem(BaseModel):
    id: str
    user_name: str
    action: str
    target_name: Optional[str] = None
    folder_name: Optional[str] = None
    created_at: datetime


class HeatmapOut(BaseModel):
    org: Dict[str, int]
    me: Dict[str, int]


class FolderSummary(BaseModel):
    id: str
    name: str
    type: str
    color: Optional[str] = None
    count: dict


class RecentlyViewedOut(BaseModel):
    id: str
    title: str
    file_type: str
    folder: dict
    viewed_at: datetime


class DashboardOut(BaseModel):
    stats: StatsOut
    recent_reports: List[RecentReportOut]
    activity_feed: List[ActivityFeedItem]
    heatmap: HeatmapOut
    shared_with_me: List[FolderSummary]
    stale_folders: List[FolderSummary]
    recently_viewed: List[RecentlyViewedOut]


class SearchResultOut(BaseModel):
    folders: List[dict]
    reports: List[dict]


class AuditItemOut(BaseModel):
    id: str
    user_name: str
    action: str
    target_name: Optional[str] = None
    folder_name: Optional[str] = None
    created_at: datetime


class AuditListOut(BaseModel):
    items: List[AuditItemOut]
    total: int
    page: int
    pages: int


class PinnedOut(BaseModel):
    id: str
    folder: dict
