import os
import socket
import threading
import time
import datetime as dt
import re
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

# Small in-memory cache for discovered OIDs (TTL ~10 min)
_LOG_OID_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}
_LOG_OID_TTL_SECS = 600

# Syslog ring buffer and listener state
_SYSLOG_BUFFER: Deque[str] = deque(maxlen=2000)
_SYSLOG_THREAD: Optional[threading.Thread] = None
_SYSLOG_RUNNING = False
_SYSLOG_BIND_ERROR: Optional[str] = None

_KEYWORDS = ("log", "event", "alarm", "history")


def _now_ts() -> float:
    return time.time()


def _is_human_text(s: str) -> bool:
    if not s:
        return False
    if len(s.strip()) < 3:
        return False
    # Contains letters or punctuation typical of messages
    return bool(re.search(r"[A-Za-z]", s))


def _column_base_oid(oid: str) -> str:
    # Remove the last numeric index from an OID to derive column base
    parts = [p for p in oid.split(".") if p]
    if not parts:
        return oid
    return ".".join(parts[:-1])


def _classify_severity(msg: str) -> str:
    m = msg.lower()
    if any(w in m for w in ("critical", "panic", "fatal", "kernel oops")):
        return "ERROR"
    if any(w in m for w in ("error", "fail", "failed", "down")):
        return "ERROR"
    if any(w in m for w in ("warn", "warning", "degraded")):
        return "WARN"
    if any(w in m for w in ("info", "started", "link up", "up")):
        return "INFO"
    return "UNKNOWN"


def _parse_time_from_text(text: str) -> Optional[str]:
    # Try RFC3339/ISO8601
    try:
        t = dt.datetime.fromisoformat(text.strip().split()[0])
        return t.isoformat()
    except Exception:
        pass
    # Try syslog: 'Oct 31 12:34:56'
    m = re.search(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}", text)
    if m:
        mon_str = m.group(0)
        # Use current year for normalization
        try:
            year = dt.datetime.now().year
            t = dt.datetime.strptime(f"{year} {mon_str}", "%Y %b %d %H:%M:%S")
            return t.isoformat()
        except Exception:
            pass
    return None


def discover_log_oids(ip: str, community: str = "public", *, force_refresh: bool = False, max_rows: int = 400) -> List[str]:
    """Walk Proxim vendor subtree and return candidate OIDs (column base OIDs) likely containing logs.
    Filters for string-like values that include keywords or look like messages.
    Caches results per (ip, community) for ~10 minutes.
    """
    cache_key = (ip, community)
    if not force_refresh:
        entry = _LOG_OID_CACHE.get(cache_key)
        if entry and (_now_ts() - entry["ts"] < _LOG_OID_TTL_SECS):
            return list(entry.get("oids", []))

    # Import here to avoid hard dependency at import time
    try:
        from .snmp_client import snmp_walk
    except Exception:
        _LOG_OID_CACHE[cache_key] = {"ts": _now_ts(), "oids": []}
        return []

    base = "1.3.6.1.4.1.841"  # Proxim enterprise subtree
    rows = snmp_walk(ip, community, base, max_rows=max_rows)
    candidates: Dict[str, int] = {}
    for oid, val in rows:
        sval = str(val).strip()
        if not _is_human_text(sval):
            continue
        lower = sval.lower()
        if any(k in lower for k in _KEYWORDS) or len(sval) >= 8:
            col_base = _column_base_oid(oid)
            candidates[col_base] = candidates.get(col_base, 0) + 1

    # Sort by frequency descending
    sorted_oids = [oid for oid, _ in sorted(candidates.items(), key=lambda x: x[1], reverse=True)]
    # Cache
    _LOG_OID_CACHE[cache_key] = {"ts": _now_ts(), "oids": sorted_oids}
    return sorted_oids


def fetch_snmp_logs(ip: str, community: str = "public", *, limit: int = 200, since: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch logs over SNMP from previously discovered OIDs. Never simulate data; return [] if none.
    """
    try:
        from .snmp_client import snmp_walk
    except Exception:
        return []

    candidates = discover_log_oids(ip, community)
    if not candidates:
        return []

    # Parse 'since' if provided
    since_dt: Optional[dt.datetime] = None
    if since:
        try:
            since_dt = dt.datetime.fromisoformat(since.replace("Z", "+00:00"))
        except Exception:
            since_dt = None

    items: List[Dict[str, Any]] = []
    for base in candidates[:8]:  # cap number of columns walked per call
        rows = snmp_walk(ip, community, base, max_rows=limit * 2)
        for oid, val in rows:
            msg = str(val).strip()
            if not _is_human_text(msg):
                continue
            when = _parse_time_from_text(msg)
            if since_dt and when:
                try:
                    wdt = dt.datetime.fromisoformat(when)
                    if wdt < since_dt:
                        continue
                except Exception:
                    pass
            sev = _classify_severity(msg)
            items.append({"time": when, "type": sev, "message": msg})
            if len(items) >= limit:
                break
        if len(items) >= limit:
            break

    return items[:limit]


def _ensure_syslog_listener() -> None:
    global _SYSLOG_THREAD, _SYSLOG_RUNNING, _SYSLOG_BIND_ERROR
    if _SYSLOG_RUNNING or _SYSLOG_THREAD:
        return

    def _run():
        global _SYSLOG_RUNNING, _SYSLOG_BIND_ERROR
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Try privileged port 514 first; if fails, capture error and exit.
            port = int(os.getenv("METRO_SYSLOG_PORT", "514"))
            sock.bind(("0.0.0.0", port))
        except Exception as e:
            _SYSLOG_BIND_ERROR = str(e)
            try:
                sock.close()
            except Exception:
                pass
            return

        _SYSLOG_RUNNING = True
        try:
            while _SYSLOG_RUNNING:
                try:
                    sock.settimeout(0.5)
                    data, _addr = sock.recvfrom(8192)
                    line = data.decode(errors="ignore").strip()
                    if line:
                        _SYSLOG_BUFFER.append(line)
                except socket.timeout:
                    continue
                except Exception:
                    continue
        finally:
            try:
                sock.close()
            except Exception:
                pass

    _SYSLOG_THREAD = threading.Thread(target=_run, name="syslog-listener", daemon=True)
    _SYSLOG_THREAD.start()


def _parse_syslog_line(line: str) -> Dict[str, Any]:
    when = _parse_time_from_text(line)
    sev = _classify_severity(line)
    # Strip common syslog header: "<month day time> host process[pid]: "
    msg = re.sub(r"^(?:\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+[^:]+:\s*", "", line).strip()
    return {"time": when, "type": sev, "message": msg}


def _tail_file(path: str, limit: int) -> List[str]:
    try:
        with open(path, "r", errors="ignore") as f:
            try:
                f.seek(0, os.SEEK_END)
                size = f.tell()
                chunk = 8192
                data = b""
                while size > 0 and data.count(b"\n") <= limit * 2:
                    read = min(chunk, size)
                    size -= read
                    f.seek(size)
                    data = f.read(read).encode() + data  # naive but ok for small files
                text = data.decode(errors="ignore")
            except Exception:
                f.seek(0)
                text = f.read()
        lines = [ln for ln in text.splitlines() if ln.strip()]
        return lines[-limit:]
    except Exception:
        return []


def fetch_syslog_tail(*, limit: int = 200, file_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Tail syslog from a rotating file or in-memory UDP buffer. Returns [] if nothing available.
    """
    # Prefer configured file if present
    path = file_path or os.getenv("METRO_PROXIM_LOG_FILE", "/var/log/proxim.log")
    if os.path.exists(path):
        lines = _tail_file(path, limit)
        return [_parse_syslog_line(ln) for ln in lines]

    # Attempt to ensure UDP 514 listener
    _ensure_syslog_listener()
    # If listener failed to bind privileged port, we cannot collect; return []
    if _SYSLOG_BIND_ERROR and not _SYSLOG_RUNNING:
        return []
    # Pull last N messages from buffer
    if not _SYSLOG_BUFFER:
        # give the listener a brief chance to capture something without blocking caller
        time.sleep(0.05)
    if not _SYSLOG_BUFFER:
        return []
    lines = list(_SYSLOG_BUFFER)[-limit:]
    return [_parse_syslog_line(ln) for ln in lines]


__all__ = [
    "discover_log_oids",
    "fetch_snmp_logs",
    "fetch_syslog_tail",
]
