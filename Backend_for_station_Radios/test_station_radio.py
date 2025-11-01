#!/usr/bin/env python3
"""Test SNMP connectivity to Station Radio"""

from . import snmp_client

# Your Station Radio IP address
station_radio_ip = "10.205.5.20"

# Test common SNMP community strings
communities = ['public', 'private', 'admin', 'manager', 'read', 'write', 'community', 'snmp']

print(f"Testing SNMP connectivity to Station Radio at {station_radio_ip}")
print("=" * 60)

for community in communities:
    print(f"Testing community '{community}'...", end=" ")
    try:
        result = snmp_client.snmp_get(station_radio_ip, community, "1.3.6.1.2.1.1.1.0")
        if result and result != "Simulated SNMP Response":
            print(f"✓ SUCCESS!")
            print(f"  System Description: {result}")
            
            # Try to get system name too
            sys_name = snmp_client.snmp_get(station_radio_ip, community, "1.3.6.1.2.1.1.5.0")
            if sys_name:
                print(f"  System Name: {sys_name}")
            
            break
        else:
            print("✗ No response")
    except Exception as e:
        print(f"✗ Error: {e}")

print("\nIf no SNMP responses were found, your Station Radio may have:")
print("1. SNMP disabled")
print("2. Custom community string")
print("3. SNMP on different port (not 161)")
print("4. SNMP v3 authentication required")

# Test basic connectivity with ping
print(f"\nTesting basic connectivity to {station_radio_ip}...")
import subprocess
try:
    result = subprocess.run(['ping', '-n', '1', station_radio_ip], capture_output=True, text=True, timeout=5)
    if result.returncode == 0:
        print("✓ Device responds to ping - network connectivity OK")
    else:
        print("✗ Device does not respond to ping")
except Exception as e:
    print(f"✗ Ping test failed: {e}")