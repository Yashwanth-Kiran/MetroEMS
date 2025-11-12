#!/usr/bin/env python3
"""
Simple FastAPI test to isolate the server shutdown issue
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Simple Test Server")

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/test")
def test_endpoint():
    """Simple test endpoint"""
    return {"status": "success", "message": "Server is working!"}

@app.get("/test/discover")
def test_discover():
    """Test endpoint to discover Station Radio devices"""
    print("🔍 Testing Station Radio discovery...")
    
    try:
        # Import real device detector
        from real_device_detector import detect_real_station_radios, get_your_station_radio_ip
        
        print("🔍 Starting real device discovery...")
        
        # First, try to find your specific Station Radio
        your_station_radio_ip = get_your_station_radio_ip()
        print(f"Your Station Radio IP: {your_station_radio_ip}")
        
        # Then get all real devices on the network
        real_devices = detect_real_station_radios()
        print(f"Found {len(real_devices)} real devices")
        
        candidates = []
        
        # Add your specific Station Radio if found
        if your_station_radio_ip:
            candidates.append({
                "ip": your_station_radio_ip,
                "hint": "station_radio",
                "description": f"Your Station Radio Device at {your_station_radio_ip} (MAC: 00-20-a6-f4-03-e6)",
                "device_type": "Station Radio",
                "system_name": f"Station Radio at {your_station_radio_ip}",
                "network": "Ethernet Network",
                "is_real_station_radio": True,
                "status": "online",
                "discovery_method": "specific_mac_detection"
            })
        
        # Add other real devices found
        for device in real_devices:
            if device['ip'] != your_station_radio_ip:  # Avoid duplicates
                candidates.append(device)
        
        print(f"✅ Discovery complete: {len(candidates)} devices found")
        return {"candidates": candidates}
        
    except Exception as e:
        print(f"❌ Discovery error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "candidates": []}

if __name__ == "__main__":
    import uvicorn
    print("Starting Simple Test Server...")
    print("Access the API at: http://localhost:8003")
    print("Test endpoint: http://localhost:8003/test")
    print("Discovery endpoint: http://localhost:8003/test/discover")
    uvicorn.run(app, host="0.0.0.0", port=8003)