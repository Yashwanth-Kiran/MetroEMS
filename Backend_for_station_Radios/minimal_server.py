#!/usr/bin/env python3
"""
Minimal Backend Server to test connectivity
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="MetroEMS Backend - Test")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "MetroEMS Backend is running", "status": "OK"}

@app.get("/health")
def health():
    return {"status": "healthy", "backend": "running"}

@app.post("/auth/login")
def login():
    """Mock login endpoint"""
    return {
        "token": "mock_token_123",
        "role": "admin",
        "org": "metro",
        "username": "admin"
    }

@app.get("/wizard/device-types")
def get_device_types():
    """Get supported device types"""
    return [
        "station_radio",
        "train_radio",
        "encoder",
        "transcoder"
    ]

@app.post("/wizard/discover")
def discover_devices():
    """Discover Station Radio devices"""
    return {
        "candidates": [
            {
                "ip": "10.205.5.20",
                "hint": "station_radio",
                "description": "Your Station Radio Device at 10.205.5.20 (Real Device)",
                "device_type": "Station Radio",
                "system_name": "Station Radio at 10.205.5.20",
                "network": "Ethernet Network",
                "is_real_station_radio": True,
                "status": "online",
                "discovery_method": "real_detection"
            }
        ]
    }

@app.post("/session/start")
def start_session():
    """Start a device management session"""
    return {
        "session_id": 1,
        "status": "active",
        "device_ip": "10.205.5.20"
    }

@app.get("/test/devices")
def test_devices():
    """Test endpoint with sample devices"""
    return {
        "candidates": [
            {
                "ip": "10.205.5.20",
                "hint": "station_radio",
                "description": "Station Radio Device at 10.205.5.20",
                "device_type": "Station Radio",
                "system_name": "Station Radio",
                "is_real_station_radio": True,
                "status": "online"
            }
        ]
    }

if __name__ == "__main__":
    print("Starting Minimal MetroEMS Backend...")
    print("Backend URL: http://localhost:8002")
    print("Health check: http://localhost:8002/health")
    print("Test devices: http://localhost:8002/test/devices")
    uvicorn.run(app, host="0.0.0.0", port=8002)