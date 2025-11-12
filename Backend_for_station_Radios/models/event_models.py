from __future__ import annotations

from pydantic import BaseModel
from typing import Optional


class Event(BaseModel):
    id: Optional[str] = None
    uei: Optional[str] = None
    severity: Optional[str] = None
    source: Optional[str] = None
    message: Optional[str] = None
    created: Optional[str] = None
