from fastapi import APIRouter, HTTPException
from .db import get_db
from .security import verify_pw, make_token
from .audit import write_audit
router = APIRouter(prefix="/auth", tags=["auth"])
@router.post("/login")
def login(payload: dict):
    username = payload.get("username"); password = payload.get("password")
    db = get_db()
    row = db.execute("SELECT username, pass_hash, role, org_code FROM users WHERE username=?",(username,)).fetchone()
    db.close()
    if not row or not verify_pw(password, row["pass_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(row["username"], row["role"], row["org_code"])
    write_audit(username, "LOGIN")
    return {"token": token, "role": row["role"], "org": row["org_code"]}
