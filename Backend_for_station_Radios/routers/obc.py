from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Optional

from ..obc_client import (
    get_obc_summary,
    get_obc_netstats,
    get_obc_cpu,
    get_obc_uptime,
    get_obc_disk,
    get_obc_config,
)
from ..models.obc_models import ObcSummary

router = APIRouter(prefix="/obc", tags=["obc"])

@router.get("/{ip}/summary", response_model=ObcSummary)
def obc_summary(ip: str, nodeId: Optional[int] = Query(default=None)):
    return get_obc_summary(ip, node_id=nodeId)

@router.get("/{ip}/netstats")
def obc_netstats(ip: str):
    return get_obc_netstats(ip)

@router.get("/{ip}/cpu")
def obc_cpu(ip: str):
    return {"cpu": get_obc_cpu(ip)}

@router.get("/{ip}/uptime")
def obc_uptime(ip: str):
    return {"uptime": get_obc_uptime(ip)}

@router.get("/{ip}/disk")
def obc_disk(ip: str):
    return get_obc_disk(ip)

@router.get("/{ip}/config")
def obc_config(ip: str):
    return get_obc_config(ip)
