from __future__ import annotations
from typing import Any, Dict, List, Optional

from ..snmp_client import snmp_get, snmp_walk, snmp_set
from .base import DeviceDriver

class ProximDriver(DeviceDriver):
    vendor = "proxim"
    device_type = "station_radio"
    enterprise_oid_prefix = "1.3.6.1.4.1.841"

    def identify(self, ip: str, c: str = "public") -> Dict[str, Any]:
        sysdescr = snmp_get(ip, c, "1.3.6.1.2.1.1.1.0")
        sysobj   = snmp_get(ip, c, "1.3.6.1.2.1.1.2.0")
        match = False
        if sysdescr and isinstance(sysdescr, str) and ("Tsunami" in sysdescr or "Proxim" in sysdescr):
            match = True
        if sysobj and isinstance(sysobj, str) and isinstance(self.enterprise_oid_prefix, str) and sysobj.startswith(self.enterprise_oid_prefix):
            match = True
        return {"match": match, "sysDescr": sysdescr, "sysObjectID": sysobj}

    def inventory(self, ip: str, c: str = "public") -> Dict[str, Any]:
        upt = snmp_get(ip, c, "1.3.6.1.2.1.1.3.0")
        macs = snmp_walk(ip, c, "1.3.6.1.2.1.2.2.1.6")  # ifPhysAddress
        name = snmp_get(ip, c, "1.3.6.1.2.1.1.5.0") or snmp_get(ip, c, "1.3.6.1.4.1.841.1.1.2.1.5.8")
        return {
            "uptime": upt,
            "macs": [m[1] for m in macs],
            "systemName": name,
        }

    def metrics(self, ip: str, c: str = "public") -> Dict[str, Any]:
        # NOTE: Replace placeholders with exact OIDs from your MIB if available
        snr = snmp_get(ip, c, "1.3.6.1.4.1.841.1000.1.1.2.0")
        rssi= snmp_get(ip, c, "1.3.6.1.4.1.841.1000.1.1.1.0")
        return {"snr": snr, "rssi": rssi}

    def enable_syslog(self, ip: str, collector_ip: str, c_set: str = "private") -> bool:
        # Best-effort: try to discover syslog host/enable OIDs by walking vendor tree
        # and setting nodes that look like syslog host/enable. If none, return False.
        base = self.enterprise_oid_prefix or "1.3.6.1.4.1.841"
        rows = snmp_walk(ip, c_set, base)
        host_oid = None
        enable_oid = None
        for oid, _val in rows:
            l = oid.lower()
            if "syslog" in l and ("host" in l or l.endswith(".1.0") or l.endswith(".0")):
                host_oid = oid
            if "syslog" in l and ("enable" in l or "status" in l):
                enable_oid = oid
            if host_oid and enable_oid:
                break
        ok_host = snmp_set(ip, c_set, host_oid, collector_ip) if host_oid else False
        ok_en   = snmp_set(ip, c_set, enable_oid, 1) if enable_oid else False
        return bool(ok_host and ok_en)
