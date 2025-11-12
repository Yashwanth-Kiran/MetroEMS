"""Client helpers for OBC device REST API."""
from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import HTTPException
try:
    from requests import RequestException  # type: ignore
except Exception:  # pragma: no cover
    class RequestException(Exception):
        pass

from .http_client import http_get_json, http_get_text
from .models.obc_models import ObcSummary
from . import metronms_client

TIMEOUT = 3.0
import os
_OBC_PORT = os.getenv("METRO_OBC_PORT", "8084")


def _wrap_request(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except RequestException as e:
        raise HTTPException(status_code=502, detail=f"Downstream OBC error: {e}") from e
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"OBC invalid response: {e}") from e

def build_obc_base(ip: str) -> str:
    return f"http://{ip}:{_OBC_PORT}/obc/api/v1"


def get_obc_netstats(ip: str) -> Dict[str, Any]:
    url = f"{build_obc_base(ip)}/netstats"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    return data if isinstance(data, dict) else {"raw": data}


def get_obc_cpu(ip: str) -> Optional[float]:
    url = f"{build_obc_base(ip)}/cpu"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    # Expect { "cpu": "2.75" }
    if isinstance(data, dict):
        val = data.get("cpu")
        if val is None:
            return None
        try:
            return float(val)
        except Exception:
            return None
    # If plain text returned
    if isinstance(data, str):
        try:
            return float(data.strip())
        except Exception:
            return None
    return None


def get_obc_uptime(ip: str) -> Optional[str]:
    url = f"{build_obc_base(ip)}/uptime"
    try:
        text = _wrap_request(http_get_text, url, timeout=TIMEOUT)
        return text.strip().strip('"')
    except HTTPException:
        raise


def get_obc_disk(ip: str) -> Dict[str, Any]:
    url = f"{build_obc_base(ip)}/disk"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    return data if isinstance(data, dict) else {"raw": data}


def get_obc_config(ip: str) -> Dict[str, Any]:
    url = f"{build_obc_base(ip)}/config"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    return data if isinstance(data, dict) else {"raw": data}


def get_obc_summary(ip: str, node_id: Optional[int] = None) -> ObcSummary:
    cpu = get_obc_cpu(ip)
    uptime = get_obc_uptime(ip)
    disk = get_obc_disk(ip)
    netstats = get_obc_netstats(ip)
    config = get_obc_config(ip)

    latency_ms = throughput = temp_c = cpu_from_nms = None
    if node_id is not None:
        latency_ms = metronms_client.get_latency(node_id)
        throughput = metronms_client.get_throughput(node_id)
        cpu_from_nms = metronms_client.get_cpu(node_id)
        temp_c = metronms_client.get_temp(node_id)

    return ObcSummary(
        ip=ip,
        cpu=cpu,
        uptime=uptime,
        disk=disk,
        netstats=netstats,
        config=config,
        latency_ms=latency_ms,
        throughput=throughput,
        temp_c=temp_c,
        cpu_from_nms=cpu_from_nms,
    )
