#!/usr/bin/env python3
"""
Real Device Detector for Station Radio Discovery
Actually detects real devices on the network using ARP and ping
"""

import subprocess
import re
import socket
import time
import logging
import os
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

def ping_host(ip: str, timeout: int = 1) -> bool:
    """Ping a host to check if it's alive"""
    try:
        # Use ping command appropriate for Windows
        result = subprocess.run(
            ['ping', '-n', '1', '-w', str(timeout * 1000), ip],
            capture_output=True,
            text=True,
            timeout=timeout + 2,
            shell=False
        )
        return result.returncode == 0
    except Exception as e:
        logger.exception(f"ping_host failed for {ip}: {e}")
        return False

def get_arp_table() -> Dict[str, str]:
    """Get the ARP table to find devices on the network"""
    arp_entries = {}
    try:
        # Get ARP table. Use shell=True to access built-in arp on Windows reliably.
        result = subprocess.run('arp -a', capture_output=True, text=True, shell=True)
        
        # Parse ARP entries
        for line in result.stdout.split('\n'):
            line = line.strip()
            if line and 'dynamic' in line.lower():
                # Extract IP and MAC from ARP entry
                # Format: IP_ADDRESS MAC_ADDRESS dynamic
                parts = line.split()
                if len(parts) >= 2:
                    ip = parts[0].strip()
                    mac = parts[1].strip()
                    # Basic IP validation
                    if re.match(r'^\d+\.\d+\.\d+\.\d+$', ip):
                        arp_entries[ip] = mac
                        
    except Exception as e:
        logger.exception(f"Error getting ARP table: {e}")
        
    return arp_entries

def get_local_network_ranges() -> List[str]:
    """Get the actual local network ranges from system"""
    networks = []
    try:
        result = subprocess.run('ipconfig', capture_output=True, text=True, shell=True)
        
        current_ip = None
        current_mask = None
        
        for line in result.stdout.split('\n'):
            line = line.strip()
            
            # Look for IPv4 addresses
            if 'IPv4 Address' in line:
                ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                if ip_match:
                    current_ip = ip_match.group(1)
                    
            elif 'Subnet Mask' in line:
                mask_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                if mask_match and current_ip:
                    current_mask = mask_match.group(1)
                    
                    # Calculate network range
                    network_base = get_network_base(current_ip, current_mask)
                    if network_base:
                        networks.append(network_base)
                    
                    current_ip = None
                    current_mask = None
                    
    except Exception as e:
        logger.exception(f"Error getting network ranges: {e}")
        
    return networks

def get_network_base(ip: str, mask: str) -> Optional[str]:
    """Calculate network base from IP and mask"""
    try:
        ip_parts = [int(x) for x in ip.split('.')]
        mask_parts = [int(x) for x in mask.split('.')]
        
        network_parts = [ip_parts[i] & mask_parts[i] for i in range(4)]
        
        # Return network base for scanning (e.g., "192.168.1.")
        if mask_parts[2] == 255:  # /24 network
            return f"{network_parts[0]}.{network_parts[1]}.{network_parts[2]}."
        elif mask_parts[1] == 255:  # /16 network
            return f"{network_parts[0]}.{network_parts[1]}."
        else:  # /8 network
            return f"{network_parts[0]}."
            
    except Exception:
        return None

def detect_real_station_radios() -> List[Dict]:
    """Detect real Station Radio devices on the network"""
    logger.info("Starting real Station Radio detection...")
    
    # Get devices from ARP table (devices that have communicated recently)
    arp_devices = get_arp_table()
    logger.info(f"Found {len(arp_devices)} devices in ARP table")
    
    real_devices = []
    station_radio_indicators = [
        # Common Station Radio MAC prefixes (you may need to add your device's)
        '00:20:a6',  # Common radio manufacturer
        '00:0c:42',  # Another common prefix
        '00:1b:8b',  # Another manufacturer
    ]
    
    # Check each device in ARP table
    for ip, mac in arp_devices.items():
        logger.debug(f"Checking device at {ip} (MAC: {mac})")
        
        # Skip localhost and common router IPs
        if ip in ['127.0.0.1', '0.0.0.0'] or ip.endswith('.1') or ip.endswith('.254'):
            continue
            
        # Check if device is currently reachable
        if ping_host(ip, timeout=2):
            logger.debug(f"Device at {ip} is alive")
            
            # Check if MAC suggests it's a Station Radio
            mac_lower = mac.lower()
            is_potential_station_radio = any(prefix in mac_lower for prefix in station_radio_indicators)
            
            # Try to get device info
            device_info = {
                "ip": ip,
                "mac": mac,
                "hint": "station_radio" if is_potential_station_radio else "unknown_device",
                "description": f"Network Device at {ip} (MAC: {mac})",
                "device_type": "Station Radio" if is_potential_station_radio else "Network Device",
                "system_name": f"Device at {ip}",
                "network": get_network_name_from_ip(ip),
                "is_real_station_radio": is_potential_station_radio,
                "status": "online",
                "discovery_method": "arp_ping_detection",
                "last_seen": time.time()
            }
            
            # Try to get more detailed info via SNMP or other methods
            enhanced_info = try_get_device_details(ip)
            if enhanced_info:
                device_info.update(enhanced_info)
                
            real_devices.append(device_info)
            logger.debug(f"Added device: {device_info['description']}")
        else:
            logger.debug(f"Device at {ip} not responding to ping")
    
    logger.info(f"Real device detection complete: Found {len(real_devices)} live devices")
    return real_devices

def get_network_name_from_ip(ip: str) -> str:
    """Get network name based on IP address"""
    if ip.startswith('10.205.'):
        return "Ethernet Network"
    elif ip.startswith('192.168.1.'):
        return "WiFi Network"
    elif ip.startswith('192.168.0.'):
        return "Router Network"
    else:
        return "Unknown Network"

def try_get_device_details(ip: str) -> Optional[Dict]:
    """Try to get additional device details via various methods"""
    details = {}
    
    try:
        # Try reverse DNS lookup
        hostname = socket.gethostbyaddr(ip)[0]
        if hostname and hostname != ip:
            details['hostname'] = hostname
            details['system_name'] = hostname
            
            # Check if hostname suggests Station Radio
            hostname_lower = hostname.lower()
            if any(keyword in hostname_lower for keyword in ['radio', 'station', 'wireless', 'ap']):
                details['is_real_station_radio'] = True
                details['device_type'] = "Station Radio"
                details['description'] = f"Station Radio Device at {ip} ({hostname})"
                
    except Exception:
        pass
    
    # Could add more detection methods here (HTTP probes, SNMP, etc.)
    
    return details if details else None

def get_your_station_radio_ip() -> Optional[str]:
    """Find Station Radio by direct IP env override or by MAC in ARP table."""
    # 1) Environment override for IP
    env_ip = os.environ.get("METRO_STATION_RADIO_IP")
    if env_ip:
        if ping_host(env_ip):
            logger.info(f"Found Station Radio via METRO_STATION_RADIO_IP at {env_ip}")
            return env_ip
        else:
            logger.warning(f"METRO_STATION_RADIO_IP set to {env_ip} but device not responding")

    # 2) Environment override for MAC or default MAC
    target_mac = os.environ.get("METRO_STATION_RADIO_MAC", "00-20-a6-f4-03-e6")
    target_normalized = target_mac.replace(':', '-').replace('.', '').lower()

    arp_devices = get_arp_table()

    for ip, mac in arp_devices.items():
        # Normalize MAC format for comparison
        normalized_mac = mac.replace(':', '-').replace('.', '').lower()
        if normalized_mac == target_normalized:
            if ping_host(ip):
                logger.info(f"Found Station Radio by MAC at {ip} (MAC: {mac})")
                return ip
            else:
                logger.warning(f"Found Station Radio MAC at {ip} but device not responding")

    return None

if __name__ == "__main__":
    # Test the detection
    print("Testing real device detection...")
    devices = detect_real_station_radios()
    
    print(f"\nFound {len(devices)} real devices:")
    for device in devices:
        print(f"  - {device['ip']}: {device['description']}")
        
    # Look specifically for your Station Radio
    your_radio_ip = get_your_station_radio_ip()
    if your_radio_ip:
        print(f"\n🎯 Your Station Radio found at: {your_radio_ip}")
    else:
        print("\n❌ Your Station Radio not found or not responding")