#!/usr/bin/env python3
"""
Database setup script for MetroEMS Backend
Creates the SQLite database with required tables and initial data
"""

import sqlite3
import bcrypt
from pathlib import Path
from datetime import datetime

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def setup_database():
    """Set up the SQLite database with initial schema and data"""
    db_path = Path(__file__).resolve().parent / "ems.db"
    
    # Remove existing database if it exists
    if db_path.exists():
        db_path.unlink()
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            pass_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            org_code TEXT NOT NULL,
            created_at TEXT NOT NULL,
            active INTEGER DEFAULT 1
        )
    """)
    
    # Create license table
    cursor.execute("""
        CREATE TABLE license (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org_code TEXT NOT NULL,
            license_id TEXT UNIQUE NOT NULL,
            issued_at TEXT NOT NULL,
            expires_at TEXT,
            active INTEGER DEFAULT 1
        )
    """)
    
    # Create sessions table
    cursor.execute("""
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            ip TEXT NOT NULL,
            device_type TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            last_activity TEXT
        )
    """)
    
    # Create audit table
    cursor.execute("""
        CREATE TABLE audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts TEXT NOT NULL,
            user TEXT NOT NULL,
            action TEXT NOT NULL,
            ip TEXT,
            device_type TEXT,
            extra_json TEXT,
            session_id INTEGER
        )
    """)
    
    # Create device_configs table for storing device configurations
    cursor.execute("""
        CREATE TABLE device_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_ip TEXT NOT NULL,
            device_type TEXT NOT NULL,
            config_json TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL
        )
    """)
    
    # Insert default admin user
    admin_password = hash_password("admin123")
    cursor.execute("""
        INSERT INTO users (username, pass_hash, role, org_code, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, ("MetroAdmin", admin_password, "admin", "METRO", datetime.utcnow().isoformat()))
    
    # Insert demo license
    cursor.execute("""
        INSERT INTO license (org_code, license_id, issued_at)
        VALUES (?, ?, ?)
    """, ("METRO", "METRO-2025-EMS1-ACT1", datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()
    
    print(f"Database created successfully at: {db_path}")
    print("Default admin user created:")
    print("  Username: MetroAdmin")
    print("  Password: admin123")
    print("  License Key: METRO-2025-EMS1-ACT1")

if __name__ == "__main__":
    setup_database()