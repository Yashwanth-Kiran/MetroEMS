from fastapi import APIRouter
from .db import get_db
from datetime import datetime
router = APIRouter(prefix="/session", tags=["session"])
@router.post("/start")
def start_session(payload: dict):
    ip = payload["ip"]; device_type = payload["device_type"]; user = payload.get("user","unknown")
    db = get_db()
    db.execute("INSERT INTO sessions (user, ip, device_type, created_at, status) VALUES (?,?,?,?,?)",
               (user, ip, device_type, datetime.utcnow().isoformat(), "active"))
    sid = db.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    db.commit(); db.close()
    return {"session_id": sid}
@router.get("/{sid}/summary")
def summary(sid: int):
    return {"session_id": sid, "identity": {"type": "simulated", "model": "Sim-Model", "fw_version": "sim-1.0"}}
