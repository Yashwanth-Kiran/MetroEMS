"""
Device Factory for creating different types of device adapters
"""
from typing import Optional
from base import DeviceAdapter
from radio_snmp import RadioAdapter
from transcoder_snmp import TranscoderAdapter
from obc_snmp import OBCAdapter

def create_device_adapter(device_type: str, ip: str) -> Optional[DeviceAdapter]:
    """
    Create and return appropriate device adapter based on device type
    """
    adapters = {
        "station_radio": RadioAdapter,
        "transcoder": TranscoderAdapter,
        "obc": OBCAdapter
    }
    
    adapter_class = adapters.get(device_type)
    if adapter_class:
        return adapter_class(ip)
    return None