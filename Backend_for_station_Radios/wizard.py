from fastapi import APIRouter
from typing import List, Dict
try:
    from network_scanner import discover_station_radios
    NETWORK_SCANNER_AVAILABLE = True
except ImportError:
    NETWORK_SCANNER_AVAILABLE = False
    print("Warning: network_scanner module not available, using simulation")

from . import snmp_client

DEVICE_TYPES = ["station_radio","train_radio","encoder","transcoder","obc","io_box"]
router = APIRouter(prefix="/wizard", tags=["wizard"])

@router.get("/device-types")
def device_types():
    return DEVICE_TYPES

@router.post("/discover")
def discover(payload: dict):
    device_type = payload.get("device_type", "station_radio")
    
    if device_type == "station_radio" and NETWORK_SCANNER_AVAILABLE:
        try:
            print(f"Starting real network discovery for {device_type}...")
            devices = discover_station_radios()
            
            if not devices:
                # No devices found
                return {
                    "candidates": [],
                    "message": "No Station Radio devices found on the network. Please check:\n" +
                              "1. Station Radio is powered on\n" +
                              "2. Ethernet cable is connected\n" +
                              "3. SNMP is enabled on the device\n" +
                              "4. Device is on the same network segment",
                    "scan_completed": True
                }
            
            # Convert to expected format
            candidates = []
            for device in devices:
                candidates.append({
                    "ip": device["ip"],
                    "hint": "station_radio" if device["is_station_radio"] else device_type,
                    "description": device["description"],
                    "device_type": device["device_type"],
                    "system_name": device["system_name"],
                    "network": device["network"],
                    "is_real_station_radio": device["is_station_radio"]
                })
            
            station_radio_count = len([c for c in candidates if c.get("is_real_station_radio", False)])
            message = f"Found {len(candidates)} devices total, {station_radio_count} potential Station Radios"
            
            return {
                "candidates": candidates,
                "message": message,
                "scan_completed": True
            }
            
        except Exception as e:
            print(f"Network discovery failed: {e}")
            # Fall back to simulation
            return {
                "candidates": [
                    {"ip": "Error", "hint": device_type, "description": f"Network scan failed: {str(e)}"}
                ],
                "message": "Network discovery failed, check backend logs",
                "scan_completed": False
            }
    
    # Fallback simulation for other device types or when scanner not available
    print(f"Using simulation mode for {device_type}")
    return {
        "candidates": [
            {"ip": "192.168.1.101", "hint": device_type, "description": "Simulated Device 1 (Demo Mode)"},
            {"ip": "192.168.1.102", "hint": device_type, "description": "Simulated Device 2 (Demo Mode)"}
        ],
        "message": "Running in simulation mode - no real device discovery",
        "scan_completed": True
    }

@router.post("/identify")
def identify(payload: dict):
    ip = payload.get("ip")
    
    if not ip:
        return {"identified": False, "error": "No IP address provided"}
    
    # Try real SNMP identification first
    try:
        sys_descr = snmp_client.snmp_get(ip, "public", "1.3.6.1.2.1.1.1.0")
        sys_name = snmp_client.snmp_get(ip, "public", "1.3.6.1.2.1.1.5.0")
        
        if sys_descr and sys_descr != "Simulated SNMP Response":
            # Determine device type from SNMP data
            device_type = "unknown"
            model = "Unknown Model"
            
            sys_descr_lower = sys_descr.lower()
            if any(keyword in sys_descr_lower for keyword in ['radio', 'proxim', 'tsunami', 'wireless']):
                device_type = "station_radio"
                model = "Station Radio Device"
            elif any(keyword in sys_descr_lower for keyword in ['switch', 'router']):
                device_type = "network_device"
                model = "Network Equipment"
            
            return {
                "identified": True,
                "type": device_type,
                "model": model,
                "system_description": sys_descr,
                "system_name": sys_name or "Unknown",
                "fw_version": "Unknown",
                "is_real_device": True
            }
    except Exception as e:
        print(f"SNMP identification failed for {ip}: {e}")
    
    # Fallback simulation
    if ip and ip.endswith(".101"):
        return {"identified": True, "type": "radio", "model": "SimRadio-101", "fw_version": "1.0-sim", "is_real_device": False}
    return {"identified": True, "type": "encoder", "model": "SimEncoder-102", "fw_version": "1.0-sim", "is_real_device": False}
