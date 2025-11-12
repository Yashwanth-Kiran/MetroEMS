from __future__ import annotations
import os
import socket
import threading
import datetime as dt
from typing import Deque, Dict, Any
from collections import deque

from .mongo_db import get_db

_SYSLOG_THREAD = None
_SYSLOG_RUNNING = False
_SYSLOG_PORT = None
_BUFFER: Deque[Dict[str, Any]] = deque(maxlen=5000)


def start_syslog_listener() -> Dict[str, Any]:
    global _SYSLOG_THREAD, _SYSLOG_RUNNING, _SYSLOG_PORT
    if _SYSLOG_THREAD and _SYSLOG_RUNNING:
        return {"ok": True, "port": _SYSLOG_PORT}

    def _run():
        global _SYSLOG_RUNNING
        db = None
        try:
            db = get_db()
        except Exception:
            db = None
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        port = int(os.getenv("METRO_SYSLOG_PORT", "514"))
        bound = False
        for p in (port, 1514):
            try:
                sock.bind(("0.0.0.0", p))
                _SYSLOG_PORT = p
                bound = True
                break
            except Exception:
                continue
        if not bound:
            try:
                sock.close()
            except Exception:
                pass
            return
        _SYSLOG_RUNNING = True
        try:
            while _SYSLOG_RUNNING:
                try:
                    data, addr = sock.recvfrom(8192)
                    msg = data.decode(errors="ignore").strip()
                    entry = {
                        "received_at": dt.datetime.utcnow().isoformat(),
                        "from": addr[0],
                        "message": msg,
                    }
                    _BUFFER.append(entry)
                    if db is not None:
                        try:
                            db["logs"].insert_one(entry)
                        except Exception:
                            pass
                except Exception:
                    continue
        finally:
            try:
                sock.close()
            except Exception:
                pass

    _SYSLOG_THREAD = threading.Thread(target=_run, name="syslog-udp", daemon=True)
    _SYSLOG_THREAD.start()
    return {"ok": True, "port": _SYSLOG_PORT}


def recent_logs(limit: int = 200, device_ip: str | None = None):
    # Prefer Mongo if available
    try:
        db = get_db()
        q = {}
        if device_ip:
            q["from"] = device_ip
        cur = db["logs"].find(q)
        # naive slice of last N in memory if not sorted; for prod use sort by _id desc limit
        out = list(cur)[-limit:]
        return out
    except Exception:
        # fallback to memory buffer
        if not _BUFFER:
            return []
        items = list(_BUFFER)
        if device_ip:
            items = [e for e in items if e.get("from") == device_ip]
        return items[-limit:]
