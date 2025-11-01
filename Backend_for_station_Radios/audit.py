from .db import get_db
from datetime import datetime
import json
def write_audit(user: str, action: str, ip=None, device_type=None, extra=None):
    db = get_db()
    db.execute(
        "INSERT INTO audit (ts,user,action,ip,device_type,extra_json) VALUES (?,?,?,?,?,?)",
        (datetime.utcnow().isoformat(), user, action, ip, device_type, json.dumps(extra or {}))
    )
    db.commit()
    db.close()
