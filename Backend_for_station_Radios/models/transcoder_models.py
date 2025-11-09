from __future__ import annotations

from pydantic import BaseModel
from typing import List, Optional


class TranscoderLogEntry(BaseModel):
    timestamp: Optional[str] = None
    level: Optional[str] = None
    message: str


class TranscoderLogs(BaseModel):
    ip: str
    since: str
    search: str
    entries: List[TranscoderLogEntry]
