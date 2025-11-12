"""
User authentication with email/password
"""
import bcrypt
import datetime
import secrets
from typing import Optional, List, Dict
from .mongo_db import get_db as get_mongo


# In-memory storage fallback (for development without MongoDB)
USERS_DB = {}
ACTIVITIES_DB = {}
LOGS_DB = {}


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_user(email: str, password: str, name: Optional[str] = None) -> dict:
    """Create a new user"""
    user_id = secrets.token_urlsafe(16)
    hashed_password = hash_password(password)
    
    user = {
        "id": user_id,
        "email": email,
        "password": hashed_password,
        "name": name or email.split('@')[0],
        "role": "customer",
        "created_at": datetime.datetime.utcnow().isoformat(),
        "last_login": None
    }
    
    try:
        db = get_mongo()
        db["users"].insert_one(user.copy())
    except Exception:
        # Fallback to in-memory
        USERS_DB[email] = user
    
    return user


def find_user_by_email(email: str) -> Optional[dict]:
    """Find a user by email"""
    try:
        db = get_mongo()
        user = db["users"].find_one({"email": email})
        return user
    except Exception:
        return USERS_DB.get(email)


def update_last_login(email: str):
    """Update user's last login timestamp"""
    timestamp = datetime.datetime.utcnow().isoformat()
    try:
        db = get_mongo()
        db["users"].update_one(
            {"email": email},
            {"$set": {"last_login": timestamp}}
        )
    except Exception:
        if email in USERS_DB:
            USERS_DB[email]["last_login"] = timestamp


def change_password(email: str, current_password: str, new_password: str) -> bool:
    """Change user password"""
    user = find_user_by_email(email)
    if not user:
        return False
    
    if not verify_password(current_password, user["password"]):
        return False
    
    new_hash = hash_password(new_password)
    
    try:
        db = get_mongo()
        db["users"].update_one(
            {"email": email},
            {"$set": {"password": new_hash}}
        )
    except Exception:
        if email in USERS_DB:
            USERS_DB[email]["password"] = new_hash
    
    return True


def log_activity(user_id: str, email: str, action: str, description: str, 
                 ip_address: Optional[str] = None, device_type: Optional[str] = None,
                 device_ip: Optional[str] = None):
    """Log user activity"""
    activity = {
        "user_id": user_id,
        "email": email,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "action": action,
        "description": description,
        "ip_address": ip_address,
        "device_type": device_type,
        "device_ip": device_ip
    }
    
    try:
        db = get_mongo()
        db["activities"].insert_one(activity)
    except Exception:
        if user_id not in ACTIVITIES_DB:
            ACTIVITIES_DB[user_id] = []
        ACTIVITIES_DB[user_id].append(activity)


def get_user_activities(user_id: str, limit: int = 50) -> List[dict]:
    """Get user activities"""
    try:
        db = get_mongo()
        activities = list(db["activities"].find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit))
        return activities
    except Exception:
        return ACTIVITIES_DB.get(user_id, [])[:limit]


def log_system_event(level: str, category: str, message: str, details: Optional[dict] = None):
    """Log system event"""
    log_entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "level": level,
        "category": category,
        "message": message,
        "details": details or {}
    }
    
    try:
        db = get_mongo()
        db["system_logs"].insert_one(log_entry)
    except Exception:
        if "system" not in LOGS_DB:
            LOGS_DB["system"] = []
        LOGS_DB["system"].append(log_entry)


def get_system_logs(limit: int = 100, level: Optional[str] = None, 
                    category: Optional[str] = None) -> List[dict]:
    """Get system logs"""
    try:
        db = get_mongo()
        query = {}
        if level:
            query["level"] = level
        if category:
            query["category"] = category
        
        logs = list(db["system_logs"].find(query).sort("timestamp", -1).limit(limit))
        return logs
    except Exception:
        logs = LOGS_DB.get("system", [])
        if level:
            logs = [log for log in logs if log.get("level") == level]
        if category:
            logs = [log for log in logs if log.get("category") == category]
        return logs[:limit]


# Create demo user on startup
def create_demo_user():
    """Create demo user if not exists"""
    demo_email = "admin@metro.com"
    if not find_user_by_email(demo_email):
        create_user(demo_email, "admin123", "Metro Admin")
