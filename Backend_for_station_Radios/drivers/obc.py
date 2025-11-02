from __future__ import annotations
from typing import Any, Dict

from ..snmp_client import snmp_get
from .base import DeviceDriver

class OBCDriver(DeviceDriver):
    vendor = "generic-obc"
    device_type = "obc"
    enterprise_oid_prefix = None

    def identify(self, ip: str, c: str = "public") -> Dict[str, Any]:
        sysdescr = snmp_get(ip, c, "1.3.6.1.2.1.1.1.0")
        sysobj   = snmp_get(ip, c, "1.3.6.1.2.1.1.2.0")
        match = False
        if isinstance(sysdescr, str) and any(k in sysdescr.lower() for k in ["obc", "on-board", "controller"]):
            match = True
        return {"match": match, "sysDescr": sysdescr, "sysObjectID": sysobj}

    def inventory(self, ip: str, c: str = "public") -> Dict[str, Any]:
        name = snmp_get(ip, c, "1.3.6.1.2.1.1.5.0")
        return {"systemName": name}

    def metrics(self, ip: str, c: str = "public") -> Dict[str, Any]:
        return {}
