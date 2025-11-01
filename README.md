## MetroEMS – Real Station Radio Monitoring & Management

Real devices only. No simulation. The backend talks to actual hardware via SNMP and collects real syslog.

---

## Quick start (macOS/Linux)

Backend (FastAPI):

```bash
cd /Users/<you>/Desktop/metro_EMS-main
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r Backend_for_station_Radios/requirements.txt
python -m uvicorn Backend_for_station_Radios.real_backend:app --host 0.0.0.0 --port 8000
```

Frontend (React):

```bash
cd MetroEMS-main
npm install
npm start
```

Open:
- Backend health: http://localhost:8000/health
- Frontend: http://localhost:3000 (or 3001 if 3000 is busy)

Create a session to your Proxim radio (example):

```bash
curl -sS -X POST http://localhost:8000/session/start \
  -H "Content-Type: application/json" \
  -d '{"ip":"10.205.5.20","device_type":"station_radio","user":"admin","community":"public"}'
```

Fetch logs for that session (SNMP-first, syslog fallback):

```bash
curl -sS "http://localhost:8000/device-sessions/<SESSION_ID>/logs?limit=200"
```

---

## What’s inside

```
Backend_for_station_Radios/   FastAPI backend
  real_backend.py             Main API (health, discover, sessions, metrics, logs)
  snmp_client.py              pysnmp-based GET/WALK/SET with safe fallbacks
  logs_utils.py               OID discovery cache + SNMP log reader + syslog tail
  syslog_server.py            UDP syslog collector (514, fallback 1514) + Mongo
  drivers/                    Device abstraction
    base.py                   DeviceDriver + registry
    proxim.py                 Proxim implementation (identify/inventory/metrics, enable_syslog)
  mongo_db.py                 Mongo connector (MONGO_URL) with in-memory fallback
  network_scanner.py          Discovery helpers
  requirements.txt            Backend deps

MetroEMS-main/                React frontend
  src/...                     UI (Dashboard, Monitoring, Logs)
```

---

## Running the backend

### Prereqs
- Python 3.12+ (3.13 works; pysnmp optional but recommended)
- Device reachable over IP, SNMP v2c enabled

### Start
```bash
cd /path/to/metro_EMS-main
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r Backend_for_station_Radios/requirements.txt
python -m uvicorn Backend_for_station_Radios.real_backend:app --host 0.0.0.0 --port 8000
```

Health check:
```bash
curl -sS http://localhost:8000/health
```

The backend automatically starts a UDP syslog listener on port 514. If binding 514 fails (non-root), it falls back to 1514. You can override with METRO_SYSLOG_PORT.

---

## Running the frontend

```bash
cd MetroEMS-main
npm install
npm start
```

Front-end dev server on http://localhost:3000 (will offer 3001 if 3000 is busy).

---

## Real logs pipeline

1) SNMP-first
- The backend walks 1.3.6.1.4.1.841 (Proxim) and caches likely log columns for 10 minutes.
- `GET /device-sessions/{id}/logs` reads textual messages from those columns.

2) Syslog fallback
- If SNMP has no log-like nodes, the backend tails a local file (env METRO_PROXIM_LOG_FILE, default /var/log/proxim.log) or the UDP syslog buffer.
- Configure your device to send syslog to the app host IP.

Enable device syslog via SNMP (best-effort):
```bash
curl -sS -X POST "http://localhost:8000/devices/10.205.5.20/enable-syslog?collector=<APP_IP>&rw_community=<RW>"
```
If your model uses specific OIDs for syslog host/enable, share them and we will hard-wire them in the Proxim driver.

Inspect recent collector logs:
```bash
curl -sS "http://localhost:8000/logs/recent?deviceIp=10.205.5.20&limit=200"
```

---

## Discovery and device APIs

Discovery (uses your network_scanner):
```bash
curl -sS -X POST http://localhost:8000/discover -H "Content-Type: application/json" -d '{}'
```

Inventory:
```bash
curl -sS http://localhost:8000/devices/10.205.5.20/inventory
```

Metrics (plug real SNR/RSSI OIDs when known):
```bash
curl -sS http://localhost:8000/devices/10.205.5.20/metrics
```

---

## Environment

SNMP
- METRO_SNMP_COMMUNITY (default: public)
- METRO_SNMP_VERSION    (auto; try v2c then v1)
- METRO_SNMP_PORT       (default: 161)

Syslog
- METRO_SYSLOG_PORT     (default: 514; falls back to 1514)
- METRO_PROXIM_LOG_FILE (default: /var/log/proxim.log)

MongoDB
- MONGO_URL             (default: mongodb://localhost:27017/metroems)

---

## Troubleshooting

- Session start fails: wrong community or SNMP disabled. Try `/snmp/probe-community`.
- No logs: ensure device can reach your collector IP/port (try tcpdump `udp port 514`).
- SNMP private OIDs return “No Such Object”: walk the parent OID and confirm index.
- UDP 514 bind failure on macOS: run as root or rely on fallback port 1514, then point the device accordingly.
- pysnmp missing: install via requirements.txt; simple GET fallback works for common types.

---

## Contributing & License

Pull requests welcome. Focus remains: real devices only.

License: Proprietary / Internal (adjust as needed).
