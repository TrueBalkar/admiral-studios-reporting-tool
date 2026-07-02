from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ThemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime


class ThemeDetailOut(ThemeOut):
    css_content: str


class ThemeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    css_content: str


class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    css_content: Optional[str] = None
    is_default: Optional[bool] = None


class LayoutOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    name: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime


class LayoutDetailOut(LayoutOut):
    html_template: str
    css_extra: str


class LayoutCreate(BaseModel):
    type: str
    name: str
    description: Optional[str] = None
    html_template: str
    css_extra: str = ""


class LayoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    html_template: Optional[str] = None
    css_extra: Optional[str] = None
    is_default: Optional[bool] = None
