from datetime import datetime
from typing import Optional

from app.schemas.base import CamelModel


class ThemeOut(CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime


class ThemeDetailOut(ThemeOut):
    css_content: str


class ThemeCreate(CamelModel):
    name: str
    description: Optional[str] = None
    css_content: str


class ThemeUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    css_content: Optional[str] = None
    is_default: Optional[bool] = None


class LayoutOut(CamelModel):
    id: str
    type: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime


class LayoutDetailOut(LayoutOut):
    html_template: str
    css_extra: str


class LayoutCreate(CamelModel):
    type: str
    name: str
    description: Optional[str] = None
    html_template: str
    css_extra: str = ""


class LayoutUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    html_template: Optional[str] = None
    css_extra: Optional[str] = None
    is_default: Optional[bool] = None
