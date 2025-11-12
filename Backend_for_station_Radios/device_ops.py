from fastapi import APIRouter, UploadFile, File
from pathlib import Path
router = APIRouter(prefix="/ops", tags=["device-ops"])
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
@router.get("/{sid}/config")
def get_config(sid: int):
    return {"config": {"ssid": "Metro_AP", "channel": 36, "bandwidth": "20MHz"}}
@router.post("/{sid}/config")
def set_config(sid: int, payload: dict):
    return {"ok": True, "applied": payload}
@router.get("/{sid}/logs")
def get_logs(sid: int):
    return {"logs": "sample logs text..."}
@router.post("/{sid}/firmware")
async def upload_firmware(sid: int, file: UploadFile = File(...)):
    dest = DATA_DIR / "firmware" / file.filename
    dest.write_bytes(await file.read())
    return {"status": "queued", "file": str(dest)}
@router.get("/{sid}/ports")
def list_ports(sid: int):
    return {"ports": [{"id":1,"status":"up"},{"id":2,"status":"down"}]}
