"""
User models for email/password authentication
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    """User registration model"""
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    """User login model"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response (without password)"""
    id: str
    email: str
    name: Optional[str] = None
    role: str = "customer"
    created_at: str
    last_login: Optional[str] = None


class PasswordChange(BaseModel):
    """Password change model"""
    current_password: str
    new_password: str


class ActivityLog(BaseModel):
    """Activity log entry"""
    timestamp: str
    action: str
    description: str
    ip_address: Optional[str] = None
    device_type: Optional[str] = None
    device_ip: Optional[str] = None


class UserActivity(BaseModel):
    """User activity response"""
    user_id: str
    email: str
    activities: List[ActivityLog]
    total_count: int


class SystemLog(BaseModel):
    """System log entry"""
    timestamp: str
    level: str  # INFO, WARNING, ERROR
    category: str  # LOGIN, DEVICE, CONFIG, etc.
    message: str
    details: Optional[dict] = None
