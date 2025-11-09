from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Dict, Optional


class ObcNetstats(BaseModel):
    raw: Dict[str, Any]


class ObcSummary(BaseModel):
    ip: str
    cpu: Optional[float] = None
    uptime: Optional[str] = None
    disk: Optional[Dict[str, Any]] = None
    netstats: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None

    # Enrichment from MetroNMS
    latency_ms: Optional[float] = None
    throughput: Optional[Dict[str, Any]] = None
    temp_c: Optional[float] = None
    cpu_from_nms: Optional[float] = None
