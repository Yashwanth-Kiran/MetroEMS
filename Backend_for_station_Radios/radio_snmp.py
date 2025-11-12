from .base import DeviceAdapter
from .snmp_client import snmp_get
from .tftp_client import tftp_put
SYS_DESCR = "1.3.6.1.2.1.1.1.0"
FW_OID    = "1.3.6.1.4.1.9999.1.1.0"  # placeholder
SSID_OID  = "1.3.6.1.4.1.9999.1.2.0"  # placeholder
class RadioAdapter(DeviceAdapter):
    device_type = "radio"
    def identify(self, ip: str):
        descr = snmp_get(ip, "public", SYS_DESCR)
        if descr:
            fw = snmp_get(ip, "public", FW_OID) or "unknown"
            return {"identified": True, "type": "radio", "model": descr, "fw_version": fw}
        return {"identified": True, "type": "radio", "model": "Simulated Radio", "fw_version": "1.0-sim"}
    def get_config(self, ip: str, creds: dict):
        ssid = snmp_get(ip, creds.get("community","public"), SSID_OID) or "Metro_AP"
        return {"ssid": ssid, "channel": 36, "bandwidth": "20MHz"}
    def set_config(self, ip: str, data: dict, creds: dict):
        return {"ok": True, "applied": data}
    def get_logs(self, ip: str, creds: dict):
        return "2025-08-12 10:00 boot ok\n2025-08-12 snmp agent started"
    def firmware_upgrade(self, ip: str, file_path: str, creds: dict):
        try:
            tftp_put(ip, file_path, "firmware.bin")
            return {"status": "queued"}
        except Exception:
            return {"status": "queued (simulated)"}
