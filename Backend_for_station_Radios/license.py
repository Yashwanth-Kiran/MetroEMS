from fastapi import APIRouter
from .db import get_db
router = APIRouter(prefix="/license", tags=["license"])
@router.get("/status")
def license_status():
    db = get_db()
    row = db.execute("SELECT org_code, license_id, issued_at FROM license LIMIT 1").fetchone()
    db.close()
    return {"org": row["org_code"], "license_id": row["license_id"], "issued_at": row["issued_at"]}
