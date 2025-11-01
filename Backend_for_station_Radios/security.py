import bcrypt, jwt, datetime
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
