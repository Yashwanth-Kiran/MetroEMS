#!/usr/bin/env python3
"""
SNMP Adapter for Transcoder Devices
"""

from .base import DeviceAdapter
from .snmp_client import snmp_get
from typing import Dict, Any, Optional

class _SnmpClient:
    """Minimal wrapper around snmp_get to satisfy adapter usage without requiring a class in snmp_client."""
    def __init__(self, ip: str, community: str = "public"):
        self.ip = ip
        self.community = community

    def get(self, oid: str):
        return snmp_get(self.ip, self.community, oid)

    def set(self, oid: str, value):
        # Not implemented in current fallback; return False to indicate no-op
        return False

    def get_system_info(self):
        return {
            "sysName": snmp_get(self.ip, self.community, "1.3.6.1.2.1.1.5.0"),
            "sysDescr": snmp_get(self.ip, self.community, "1.3.6.1.2.1.1.1.0"),
        }


class TranscoderAdapter(DeviceAdapter):
    """Adapter for Transcoder devices using SNMP"""
    
    def __init__(self, ip: str):
        super().__init__()
        self.ip = ip
        self.snmp = _SnmpClient(ip)
        self.device_type = "transcoder"

    def identify(self, ip: str) -> Dict[str, Any]:
        """Get basic device information"""
        try:
            system_info = self.snmp.get_system_info()
            return {
                "ip": ip,
                "type": self.device_type,
                "name": system_info.get("sysName", "Unknown Transcoder"),
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
            # Transcoder-specific SNMP OIDs for configuration
            config_data = {
                "video_input": self.snmp.get(".1.3.6.1.4.1.transcoder.config.videoInput"),
                "video_output": self.snmp.get(".1.3.6.1.4.1.transcoder.config.videoOutput"),
                "encoding_profile": self.snmp.get(".1.3.6.1.4.1.transcoder.config.encodingProfile"),
                "bitrate": self.snmp.get(".1.3.6.1.4.1.transcoder.config.bitrate"),
                "resolution": self.snmp.get(".1.3.6.1.4.1.transcoder.config.resolution"),
                "frame_rate": self.snmp.get(".1.3.6.1.4.1.transcoder.config.frameRate")
            }
            return config_data
        except Exception as e:
            return {"error": f"Failed to get configuration: {str(e)}"}

    def set_config(self, ip: str, data: Dict[str, Any], creds: Dict[str, Any]) -> Dict[str, Any]:
        """Update device configuration"""
        try:
            # Map of configuration keys to their SNMP OIDs
            config_oids = {
                "video_input": ".1.3.6.1.4.1.transcoder.config.videoInput",
                "video_output": ".1.3.6.1.4.1.transcoder.config.videoOutput",
                "encoding_profile": ".1.3.6.1.4.1.transcoder.config.encodingProfile",
                "bitrate": ".1.3.6.1.4.1.transcoder.config.bitrate",
                "resolution": ".1.3.6.1.4.1.transcoder.config.resolution",
                "frame_rate": ".1.3.6.1.4.1.transcoder.config.frameRate"
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
            # Transcoder-specific SNMP OIDs for status
            status_data = {
                "cpu_usage": self.snmp.get(".1.3.6.1.4.1.transcoder.status.cpuUsage"),
                "memory_usage": self.snmp.get(".1.3.6.1.4.1.transcoder.status.memoryUsage"),
                "input_signal": self.snmp.get(".1.3.6.1.4.1.transcoder.status.inputSignal"),
                "output_stream": self.snmp.get(".1.3.6.1.4.1.transcoder.status.outputStream"),
                "temperature": self.snmp.get(".1.3.6.1.4.1.transcoder.status.temperature"),
                "uptime": self.snmp.get(".1.3.6.1.4.1.transcoder.status.uptime")
            }
            return status_data
        except Exception as e:
            return {"error": f"Failed to get status: {str(e)}"}