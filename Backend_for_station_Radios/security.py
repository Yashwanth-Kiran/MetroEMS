import bcrypt, jwt, datetime
import hashlib
SECRET = "CHANGE_ME_LOCAL_ONLY"
ALG = "HS256"

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(username: str, role: str, org: str) -> str:
    payload = {"sub": username, "role": role, "org": org,
               "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)}
    return jwt.encode(payload, SECRET, algorithm=ALG)

def compute_fingerprint(data: dict, client_ip: str) -> str:
    """Compute a fingerprint hash from device data and client IP"""
    import json
    combined = json.dumps(data, sort_keys=True) + client_ip
    return hashlib.sha256(combined.encode()).hexdigest()

def issue_jwt(role: str = "operator") -> str:
    """Issue a JWT token for the given role"""
    payload = {
        "sub": "device_user",
        "role": role,
        "org": "metro",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return jwt.encode(payload, SECRET, algorithm=ALG)

