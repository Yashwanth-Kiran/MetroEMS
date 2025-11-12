#!/usr/bin/env python3
"""
SNMP Adapter for On-Board Computer (OBC) Devices
"""

from .base import DeviceAdapter
from .snmp_client import snmp_get
from typing import Dict, Any, Optional

class _SnmpClient:
    def __init__(self, ip: str, community: str = "public"):
        self.ip = ip
        self.community = community

    def get(self, oid: str):
        return snmp_get(self.ip, self.community, oid)

    def set(self, oid: str, value):
        return False

    def get_system_info(self):
        return {
            "sysName": snmp_get(self.ip, self.community, "1.3.6.1.2.1.1.5.0"),
            "sysDescr": snmp_get(self.ip, self.community, "1.3.6.1.2.1.1.1.0"),
        }


class OBCAdapter(DeviceAdapter):
    """Adapter for On-Board Computer (OBC) devices using SNMP"""
    
    def __init__(self, ip: str):
        super().__init__()
        self.ip = ip
        self.snmp = _SnmpClient(ip)
        self.device_type = "obc"

    def identify(self, ip: str) -> Dict[str, Any]:
        """Get basic device information"""
        try:
            system_info = self.snmp.get_system_info()
            return {
                "ip": ip,
                "type": self.device_type,
                "name": system_info.get("sysName", "Unknown OBC"),
                "model": system_info.get("sysDescr", "Unknown Model"),
                "status": "online" if system_info else "offline"
            }
        except Exception as e:
            return {
                "ip": ip,
                "type": self.device_type,
                "status": "error",
                "error": str(e)
            }

    def get_config(self, ip: str, creds: Dict[str, Any]) -> Dict[str, Any]:
        """Get current device configuration"""
        try:
            # OBC-specific SNMP OIDs for configuration
            config_data = {
                "system_mode": self.snmp.get(".1.3.6.1.4.1.obc.config.systemMode"),
                "network_settings": self.snmp.get(".1.3.6.1.4.1.obc.config.networkSettings"),
                "storage_config": self.snmp.get(".1.3.6.1.4.1.obc.config.storageConfig"),
                "backup_schedule": self.snmp.get(".1.3.6.1.4.1.obc.config.backupSchedule"),
                "logging_level": self.snmp.get(".1.3.6.1.4.1.obc.config.loggingLevel"),
                "data_retention": self.snmp.get(".1.3.6.1.4.1.obc.config.dataRetention")
            }
            return config_data
        except Exception as e:
            return {"error": f"Failed to get configuration: {str(e)}"}

    def set_config(self, ip: str, data: Dict[str, Any], creds: Dict[str, Any]) -> Dict[str, Any]:
        """Update device configuration"""
        try:
            # Map of configuration keys to their SNMP OIDs
            config_oids = {
                "system_mode": ".1.3.6.1.4.1.obc.config.systemMode",
                "network_settings": ".1.3.6.1.4.1.obc.config.networkSettings",
                "storage_config": ".1.3.6.1.4.1.obc.config.storageConfig",
                "backup_schedule": ".1.3.6.1.4.1.obc.config.backupSchedule",
                "logging_level": ".1.3.6.1.4.1.obc.config.loggingLevel",
                "data_retention": ".1.3.6.1.4.1.obc.config.dataRetention"
            }
            
            # Update each configured parameter
            for key, value in data.items():
                if key in config_oids:
                    self.snmp.set(config_oids[key], value)
            
            # Return the new configuration
            return self.get_config(ip, creds)
        except Exception as e:
            return {"error": f"Failed to update configuration: {str(e)}"}

    def get_status(self) -> Dict[str, Any]:
        """Get current device status"""
        try:
            # OBC-specific SNMP OIDs for status
            status_data = {
                "cpu_usage": self.snmp.get(".1.3.6.1.4.1.obc.status.cpuUsage"),
                "memory_usage": self.snmp.get(".1.3.6.1.4.1.obc.status.memoryUsage"),
                "disk_usage": self.snmp.get(".1.3.6.1.4.1.obc.status.diskUsage"),
                "process_count": self.snmp.get(".1.3.6.1.4.1.obc.status.processCount"),
                "temperature": self.snmp.get(".1.3.6.1.4.1.obc.status.temperature"),
                "uptime": self.snmp.get(".1.3.6.1.4.1.obc.status.uptime"),
                "backup_status": self.snmp.get(".1.3.6.1.4.1.obc.status.backupStatus"),
                "system_health": self.snmp.get(".1.3.6.1.4.1.obc.status.systemHealth")
            }
            return status_data
        except Exception as e:
            return {"error": f"Failed to get status: {str(e)}"}
        