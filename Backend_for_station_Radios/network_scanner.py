#!/usr/bin/env python3
"""
Network Scanner for Station Radio Discovery
Scans local network ranges for SNMP-enabled devices
"""

import socket
import threading
import time
from typing import List, Dict
import subprocess
import re
import os

def get_local_networks():
    """Get local network ranges from system configuration"""
    networks = []
    
    try:
        # Get network configuration
        result = subprocess.run(['ipconfig'], capture_output=True, text=True, shell=True)
        lines = result.stdout.split('\n')
        
        current_adapter = None
        ip_address = None
        subnet_mask = None
        
        for line in lines:
            line = line.strip()
            
            # Check for adapter names
            if 'Ethernet adapter' in line or 'Wireless LAN adapter' in line:
                current_adapter = line
                ip_address = None
                subnet_mask = None
            
            # Check for IPv4 address
            if 'IPv4 Address' in line and ':' in line:
                ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                if ip_match:
                    ip_address = ip_match.group(1)
            
            # Check for subnet mask
            if 'Subnet Mask' in line and ':' in line:
                mask_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                if mask_match:
                    subnet_mask = mask_match.group(1)
            
            # If we have both IP and mask, calculate network
            if ip_address and subnet_mask and current_adapter:
                if not ('Media disconnected' in current_adapter or 'Media State' in current_adapter):
                    network_base = calculate_network_base(ip_address, subnet_mask)
                    if network_base:
                        networks.append({
                            'adapter': current_adapter,
                            'base': network_base,
                            'ip': ip_address,
                            'mask': subnet_mask
                        })
                        
                # Reset for next adapter
                ip_address = None
                subnet_mask = None
                
    except Exception as e:
        print(f"Error getting network configuration: {e}")
        
    # Add common fallback ranges
    fallback_networks = [
        {'base': '192.168.1.', 'adapter': 'Fallback WiFi', 'ip': '192.168.1.x', 'mask': '255.255.255.0'},
        {'base': '192.168.0.', 'adapter': 'Fallback Router', 'ip': '192.168.0.x', 'mask': '255.255.255.0'},
        {'base': '10.0.0.', 'adapter': 'Fallback Corporate', 'ip': '10.0.0.x', 'mask': '255.255.255.0'},
        {'base': '10.205.5.', 'adapter': 'Detected Ethernet', 'ip': '10.205.5.x', 'mask': '255.255.248.0'}
    ]
    
    # Add fallbacks if not already present
    existing_bases = [net['base'] for net in networks]
    for fallback in fallback_networks:
        if fallback['base'] not in existing_bases:
            networks.append(fallback)
            
    return networks

def calculate_network_base(ip_address, subnet_mask):
    """Calculate network base from IP and subnet mask"""
    try:
        ip_parts = [int(x) for x in ip_address.split('.')]
        mask_parts = [int(x) for x in subnet_mask.split('.')]
        
        # Calculate network address
        network_parts = [ip_parts[i] & mask_parts[i] for i in range(4)]
        
        # Return base for /24 networks (most common)
        if mask_parts[2] == 255:  # /24 network
            return f"{network_parts[0]}.{network_parts[1]}.{network_parts[2]}."
        elif mask_parts[1] == 255:  # /16 network  
            return f"{network_parts[0]}.{network_parts[1]}."
        else:  # /8 network
            return f"{network_parts[0]}."
            
    except Exception as e:
        print(f"Error calculating network base: {e}")
        return None

SYS_DESCR_OID = "1.3.6.1.2.1.1.1.0"
SYS_NAME_OID = "1.3.6.1.2.1.1.5.0"
SYS_OBJECTID_OID = "1.3.6.1.2.1.1.2.0"
SYS_UPTIME_OID = "1.3.6.1.2.1.1.3.0"
PROXIM_ENTERPRISE_OID = "1.3.6.1.4.1.841"
PROXIM_PRODUCT_DESCR_OID = "1.3.6.1.4.1.841.1.1.2.1.5.7"  # productDescr
PROXIM_SYSTEM_NAME_OID = "1.3.6.1.4.1.841.1.1.2.1.5.8"     # systemName

def snmp_alive(ip: str, community: str) -> bool:
    """Check device liveness by trying an SNMP GET on sysDescr.
    Avoids ICMP ping; relies purely on SNMP OID reachability.
    """
    try:
        from .snmp_client import snmp_get
        sys_descr = snmp_get(ip, community, SYS_DESCR_OID)
        return sys_descr is not None and sys_descr != "Simulated SNMP Response"
    except Exception:
        return False

def scan_for_snmp_devices(networks: List[Dict], max_threads=20, limit_hosts: int = None) -> List[Dict]:
    """Scan network ranges for SNMP-enabled devices.

    Parameters:
        networks: List of network dicts (from get_local_networks())
        max_threads: Maximum concurrent scanning threads.
        limit_hosts: If set, limits the total number of IP addresses attempted (across all networks)
                     to this number to speed up discovery. Once the limit is reached, no further
                     IPs are queued for scanning.
    """
    from .snmp_client import snmp_get
    community = os.getenv("METRO_SNMP_COMMUNITY", "public")
    
    devices = []
    threads = []
    devices_lock = threading.Lock()
    count_lock = threading.Lock()
    attempted_hosts = 0
    stop_scanning = False
    
    def scan_ip(ip, network_info):
        try:
            # SNMP-only discovery (no ping). Try multiple OIDs for liveness.
            # Try a set of permissive OIDs for liveness
            sys_descr = snmp_get(ip, community, SYS_DESCR_OID)
            if not sys_descr:
                sys_descr = snmp_get(ip, community, PROXIM_PRODUCT_DESCR_OID)
            if not sys_descr:
                sys_descr = snmp_get(ip, community, SYS_UPTIME_OID)
            if sys_descr and sys_descr != "Simulated SNMP Response":
                # Get system name
                sys_name = snmp_get(ip, community, SYS_NAME_OID) or \
                           snmp_get(ip, community, PROXIM_SYSTEM_NAME_OID) or \
                           "Unknown Device"

                # Identify vendor via sysObjectID when possible
                sys_objectid = snmp_get(ip, community, SYS_OBJECTID_OID) or ""
                is_proxim = isinstance(sys_objectid, str) and sys_objectid.startswith(PROXIM_ENTERPRISE_OID)
                
                # Try to identify if it's a Station Radio
                device_type = "Station Radio" if is_proxim else "Unknown"
                is_station_radio = is_proxim or ('radio' in sys_descr.lower())
                
                with devices_lock:
                    devices.append({
                        "ip": ip,
                        "description": sys_descr[:100] + "..." if len(sys_descr) > 100 else sys_descr,
                        "system_name": sys_name,
                        "device_type": device_type,
                        "is_station_radio": is_station_radio,
                        "network": network_info['adapter'],
                        "hint": "station_radio" if is_station_radio else "other",
                        "enterprise": sys_objectid
                    })
                    
        except Exception as e:
            # Silent fail for scan - don't spam logs
            pass
    
    print(f"Scanning {len(networks)} networks for Station Radio devices (SNMP-only)...")
    
    for network in networks:
        if stop_scanning:
            break
        base = network['base']
        print(f"Scanning network: {base}x ({network['adapter']})")
        
        # Determine scan range based on network
        if base.count('.') == 3:  # /24 network like 192.168.1.
            scan_range = range(1, 255)
        elif base.count('.') == 2:  # /16 network like 192.168.
            # Scan common subnets
            for subnet in [0, 1, 2, 5, 10, 20, 50, 100]:
                for host in [1, 10, 20, 50, 100, 200, 254]:
                    ip = f"{base}{subnet}.{host}"
                    thread = threading.Thread(target=scan_ip, args=(ip, network))
                    threads.append(thread)
                    thread.start()
                    
                    # Limit concurrent threads
                    if len(threads) >= max_threads:
                        for t in threads:
                            t.join()
                        threads = []
            continue
        else:
            scan_range = range(1, 20)  # Limited scan for /8 networks
            
        # Standard /24 scan
        for host in scan_range:
            # Check host attempt limit
            with count_lock:
                if limit_hosts is not None and attempted_hosts >= limit_hosts:
                    stop_scanning = True
                    break
                attempted_hosts += 1
            ip = f"{base}{host}"
            thread = threading.Thread(target=scan_ip, args=(ip, network))
            threads.append(thread)
            thread.start()

            # Limit concurrent threads
            if len(threads) >= max_threads:
                for t in threads:
                    t.join()
                threads = []
    
    # Wait for remaining threads
    for thread in threads:
        thread.join()
    
    print(f"Network scan complete. Found {len(devices)} devices total.")
    station_radios = [d for d in devices if d['is_station_radio']]
    print(f"Found {len(station_radios)} potential Station Radio devices.")
    
    return devices

def discover_station_radios() -> List[Dict]:
    """Main function to discover Station Radio devices"""
    networks = get_local_networks()
    print(f"Detected networks: {[n['base'] + 'x (' + n['adapter'] + ')' for n in networks]}")
    
    devices = scan_for_snmp_devices(networks)
    
    # Prioritize Station Radios
    station_radios = [d for d in devices if d['is_station_radio']]
    other_devices = [d for d in devices if not d['is_station_radio']]
    
    # Return Station Radios first, then other devices
    result = station_radios + other_devices[:5]  # Limit other devices to 5
    
    if not station_radios:
        print("No Station Radio devices found in network scan.")
        print("This could be because:")
        print("1. Station Radio is not powered on")
        print("2. Station Radio is not connected to network")
        print("3. Station Radio has SNMP disabled")
        print("4. Station Radio is on a different network segment")
        
    return result

if __name__ == "__main__":
    # Test the scanner
    devices = discover_station_radios()
    for device in devices:
        print(f"Found: {device['ip']} - {device['device_type']} - {device['description'][:50]}...")