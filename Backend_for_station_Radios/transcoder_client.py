"""Client helpers for Transcoder REST API."""
from __future__ import annotations

from datetime import date
from typing import List, Optional
from fastapi import HTTPException
import re
try:
    from requests import RequestException  # type: ignore
except Exception:  # pragma: no cover
    class RequestException(Exception):
        pass

from .http_client import http_get_json, http_get_text
from .models.transcoder_models import TranscoderLogs, TranscoderLogEntry

TIMEOUT = 3.0
import os
_TX_PORT = os.getenv("METRO_TRANSCODER_PORT", "8084")


def _wrap_request(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except RequestException as e:
        raise HTTPException(status_code=502, detail=f"Downstream Transcoder error: {e}") from e
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"Transcoder invalid response: {e}") from e


def build_tx_base(ip: str) -> str:
    return f"http://{ip}:{_TX_PORT}/transcoder/api/v1"


def _parse_log_line(line: str) -> TranscoderLogEntry:
    # Best-effort: try to parse formats like: "2025-11-07T10:10:10Z [INFO] message"
    m = re.match(r"^(?P<ts>\d{4}-\d{2}-\d{2}[^\s]*)\s+(?:\[(?P<level>\w+)\]\s+)?(?P<msg>.*)$", line)
    if m:
        return TranscoderLogEntry(timestamp=m.group("ts"), level=m.group("level"), message=m.group("msg"))
    return TranscoderLogEntry(timestamp=None, level=None, message=line)


def get_transcoder_logs(ip: str, since: date, search: str = "") -> TranscoderLogs:
    url = f"{build_tx_base(ip)}/logs?since={since.isoformat()}&search={search}"

    # Try JSON first
    try:
        data = _wrap_request(http_get_json, url, timeout=TIMEOUT)
        entries: List[TranscoderLogEntry] = []
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    entries.append(
                        TranscoderLogEntry(
                            timestamp=str(item.get("ts")) if item.get("ts") is not None else item.get("timestamp"),
                            level=item.get("level"),
                            message=item.get("message") or item.get("msg") or "",
                        )
                    )
                elif isinstance(item, str):
                    entries.append(_parse_log_line(item))
        elif isinstance(data, dict):
            # maybe under key 'logs'
            raw = data.get("logs")
            if isinstance(raw, list):
                for item in raw:
                    if isinstance(item, dict):
                        entries.append(
                            TranscoderLogEntry(
                                timestamp=str(item.get("ts")) if item.get("ts") is not None else item.get("timestamp"),
                                level=item.get("level"),
                                message=item.get("message") or item.get("msg") or "",
                            )
                        )
                    elif isinstance(item, str):
                        entries.append(_parse_log_line(item))
        if entries:
            return TranscoderLogs(ip=ip, since=since.isoformat(), search=search, entries=entries)
    except HTTPException:
        raise
    except Exception:
        # fallback to text parse
        pass

    text = _wrap_request(http_get_text, url, timeout=TIMEOUT)
    lines = [ln for ln in text.splitlines() if ln.strip()]
    entries = [_parse_log_line(ln) for ln in lines]
    return TranscoderLogs(ip=ip, since=since.isoformat(), search=search, entries=entries)
