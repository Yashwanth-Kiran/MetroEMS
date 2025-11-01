from __future__ import annotations
from typing import Any, Dict, List, Optional

class DeviceDriver:
    vendor: str = "generic"
    enterprise_oid_prefix: Optional[str] = None  # e.g., "1.3.6.1.4.1.841"

    def identify(self, ip: str, c: str = "public") -> Dict[str, Any]:
        raise NotImplementedError

    def inventory(self, ip: str, c: str = "public") -> Dict[str, Any]:
        return {}

    def metrics(self, ip: str, c: str = "public") -> Dict[str, Any]:
        return {}

    def enable_syslog(self, ip: str, collector_ip: str, c_set: str = "private") -> bool:
        return False

    def firmware(self, ip: str, action: str, **kwargs) -> Dict[str, Any]:
        return {"ok": False, "error": "not-implemented"}


class DriverRegistry:
    def __init__(self):
        self._drivers: List[DeviceDriver] = []

    def register(self, d: DeviceDriver) -> None:
        self._drivers.append(d)

    def match_by_enterprise(self, enterprise_oid: str) -> Optional[DeviceDriver]:
        for d in self._drivers:
            p = getattr(d, "enterprise_oid_prefix", None)
            if p and str(enterprise_oid).startswith(p):
                return d
        return None

    def all(self) -> List[DeviceDriver]:
        return list(self._drivers)
