#!/usr/bin/env python3
"""
Test the real device detector independently
"""

try:
    from real_device_detector import detect_real_station_radios, get_your_station_radio_ip
    print("✅ Successfully imported real_device_detector")
    
    print("🔍 Testing get_your_station_radio_ip()...")
    your_ip = get_your_station_radio_ip()
    print(f"Result: {your_ip}")
    
    print("🔍 Testing detect_real_station_radios()...")
    devices = detect_real_station_radios()
    print(f"Found {len(devices)} devices:")
    for device in devices:
        print(f"  - {device}")
    
    print("✅ Real device detector test completed successfully")
    
except Exception as e:
    print(f"❌ Error testing real device detector: {e}")
    import traceback
    traceback.print_exc()