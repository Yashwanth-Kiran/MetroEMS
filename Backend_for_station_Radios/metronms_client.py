"""Client helpers for MetroNMS / OpenNMS integration.

These functions are intentionally thin wrappers around the documented REST
endpoints so higher layers (routers) can compose them easily. All functions
return primitive types / dicts / lists or pydantic models (Event) where
appropriate. Errors are converted to FastAPI HTTPException with status 502.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
try:
    from requests import RequestException  # type: ignore
except Exception:  # pragma: no cover
    class RequestException(Exception):
        pass

from .models.event_models import Event
from .http_client import http_get_json

BASE = os.getenv("METRO_METRONMS_BASE", "http://localhost:8980/metronms")
TIMEOUT = 3.0

def _wrap_request(fn, *args, **kwargs):  # internal utility
    try:
        return fn(*args, **kwargs)
    except RequestException as e:
        raise HTTPException(status_code=502, detail=f"Downstream MetroNMS error: {e}") from e
    except ValueError as e:  # JSON decode
        raise HTTPException(status_code=502, detail=f"MetroNMS invalid JSON: {e}") from e

def get_latency(node_id: int) -> Optional[float]:
    url = f"{BASE}/api/v2/nodelinks/ping?nodeId={node_id}"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    # Expect shape { "rtt": 54.009543 }
    if isinstance(data, dict):
        val = data.get("rtt")
        try:
            return float(val) if val is not None else None
        except Exception:
            return None
    return None

def get_throughput(node_id: int) -> Optional[Dict[str, Any]]:
    # Placeholder: real URL may include complex query params for measurements
    # Accept aggregated stats returned by MetroNMS as-is.
    # Example endpoint stub (caller may adapt): /rest/measurements/node[{id}].nodeSnmp[]?duration=1h&aggregation=AVERAGE
    url = f"{BASE}/rest/measurements/node[{node_id}].nodeSnmp[]?duration=1h&aggregation=AVERAGE"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    if isinstance(data, dict):
        return data
    return {"raw": data}

def get_cpu(node_id: int) -> Optional[float]:
    url = f"{BASE}/rest/measurements/node[{node_id}].cpu?duration=1h&aggregation=AVERAGE"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    # Try to extract first numeric value
    try:
        if isinstance(data, dict):
            for v in data.values():
                try:
                    return float(v)
                except Exception:
                    continue
    except Exception:
        pass
    return None

def get_temp(node_id: int) -> Optional[float]:
    url = f"{BASE}/rest/measurements/node[{node_id}].temp?duration=1h&aggregation=AVERAGE"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    try:
        if isinstance(data, dict):
            for v in data.values():
                try:
                    return float(v)
                except Exception:
                    continue
    except Exception:
        pass
    return None

def get_events(filter_query: str, limit: int = 50, offset: int = 0) -> List[Event]:
    # Caller supplies the full filter_query component (e.g., "severity=MAJOR&uei=*" etc.)
    url = f"{BASE}/api/v2/events/list?{filter_query}&limit={limit}&offset={offset}"
    data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
    events: List[Event] = []
    if isinstance(data, list):
        for raw in data:
            if isinstance(raw, dict):
                events.append(Event(
                    id=str(raw.get("id")) if raw.get("id") is not None else None,
                    uei=raw.get("uei"),
                    severity=raw.get("severity"),
                    source=raw.get("source"),
                    message=raw.get("message"),
                    created=raw.get("created"),
                ))
    elif isinstance(data, dict):
        # Sometimes responses wrap events in a key like 'events'
        maybe = data.get("events")
        if isinstance(maybe, list):
            for raw in maybe:
                if isinstance(raw, dict):
                    events.append(Event(
                        id=str(raw.get("id")) if raw.get("id") is not None else None,
                        uei=raw.get("uei"),
                        severity=raw.get("severity"),
                        source=raw.get("source"),
                        message=raw.get("message"),
                        created=raw.get("created"),
                    ))
    return events
