#!/usr/bin/env python3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="Simple Test Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DeviceDiscoveryRequest(BaseModel):
    device_type: str

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Simple backend is running"}

@app.post("/wizard/discover")
def discover_devices(request: DeviceDiscoveryRequest):
    """Simple test discovery"""
    print(f"🔍 Discovery request for: {request.device_type}")
    
    return {
        "candidates": [],
        "message": "Test: No Station Radio detected (device not connected)",
        "total_devices_found": 0
    }

if __name__ == "__main__":
    print("🚀 Starting Simple Test Backend")
    print("📡 Backend URL: http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)