## MetroEMS – Real Station Radio Monitoring & Management

No fake devices. No simulation. The backend only lists and manages actually reachable Station Radio hardware via SNMP.

---

### Contents
1. Overview
2. Repository Structure
3. Prerequisites
4. Backend Setup (FastAPI)
5. Frontend Setup (React)
6. Running Everything Together
7. Device Discovery Behavior (Fast vs Broad Scan)
8. SNMP Details & Credentials Discovery
9. Sessions, Monitoring & Refresh
10. Environment Variables
11. Managing the Backend Process (PowerShell Helper)
12. Project Commands Reference
13. Troubleshooting
14. Roadmap / Next Enhancements

---

### 1. Overview
MetroEMS provides a focused Station Radio operations console:
- Authentication-first UI (simple token demo)
- Targeted SNMP discovery of real hardware (no ICMP ping, no fake inventory)
- Fast, single‑IP discovery path + capped broad discovery (limited to 15 hosts)
- Device session start with SNMP verification (sysDescr/sysName/productDescr)
- Live 1-second metrics (signal/SNR/tx/rx with light jitter for motion)
- On-demand summary refresh (re-polls sysDescr, sysUpTime, sysName)

### 2. Repository Structure
```
Backend_for_station_Radios/   FastAPI backend (real discovery, sessions, SNMP)
  real_backend.py             Main application
  snmp_client.py              SNMP v2c (pysnmp with raw UDP fallback) helpers
  network_scanner.py          Broad (capped) SNMP discovery logic
  PXM-SNMP.mib                Vendor MIB reference (Proxim)
  requirements.txt            Backend dependency spec
MetroEMS-main/                React frontend (CRA + Tailwind + Recharts)
  src/components/...          UI components (Dashboard, DeviceManagement, etc.)
manage_backend.ps1            PowerShell backend lifecycle manager
start_backend.bat             Simple batch starter (port 8000)
README.md                     This file
```

### 3. Prerequisites
Backend:
- Python 3.12+ (3.13 supported; raw fallback handles pysnmp gaps if any)
- Windows PowerShell (for helper script) OR standard shell

Frontend:
- Node.js 18+ (Recommend LTS)
- npm 9+

System / Network:
- Station Radio reachable on the same L2/L3 segment (or routed)
- SNMP v2c enabled on the device (community known or discoverable)

### 4. Backend Setup (FastAPI)
From repository root (PowerShell):
```
python -m venv .venv
./.venv/Scripts/Activate.ps1
pip install --upgrade pip
pip install -r Backend_for_station_Radios/requirements.txt
```

Run directly (default port 8002 for manage script, 8000 for batch):
Option A (recommended managed lifecycle / port 8002):
```
pwsh ./manage_backend.ps1 -Action start -Port 8002 -Community public
```
Option B (simple run / port 8000):
```
./start_backend.bat
```
Option C (manual uvicorn):
```
cd Backend_for_station_Radios
uvicorn real_backend:app --host 0.0.0.0 --port 8002
```
Health check:
```
curl http://localhost:8002/health
```

### 5. Frontend Setup (React)
```
cd MetroEMS-main
npm install
npm start
```
Runs on: http://localhost:3000

### 6. Running Everything Together
1. Start backend (port 8002).
2. Start frontend (port 3000).
3. Login with any credentials (demo auth accepts any user/pass).
4. Provide device IP + SNMP community in the dashboard discovery form.
5. Click Discover → device appears (if SNMP responds and heuristics match).
6. Start Session → navigate to management view (summary, monitoring, logs).

### 7. Device Discovery Behavior
- Targeted (fast path): When you enter an IP, only that host is queried (sysDescr first; optional fallback OIDs if fast=false in backend request).
- Broad Scan (fallback): If no IP entered, backend scans networks but is capped at 15 total IP attempts to keep latency low. It may NOT cover your device if outside those first samples—always prefer targeted IP.
- Heuristics: Accepts device if sysObjectID starts with `1.3.6.1.4.1.841` (Proxim) OR sysDescr contains keywords (proxim, tsunami, mp-825, cpe-50).

### 8. SNMP Details & Credentials Discovery
Core OIDs polled:
- sysDescr: 1.3.6.1.2.1.1.1.0
- sysUpTime: 1.3.6.1.2.1.1.3.0
- sysName: 1.3.6.1.2.1.1.5.0 (fallback vendor systemName: 1.3.6.1.4.1.841.1.1.2.1.5.8)
- productDescr: 1.3.6.1.4.1.841.1.1.2.1.5.7

Community probing (optional) uses /snmp/probe-community with a small dictionary (public, private, tsunami, proxim, etc.).

If pysnmp has issues under your Python version, raw UDP fallback in `snmp_client.py` decodes simple GET responses (OctetString, Integer, TimeTicks, OID).

### 9. Sessions, Monitoring & Refresh
- Start session: `/session/start` verifies liveness via first responsive OID.
- Summary refresh: `/session/{id}/refresh` re-polls sysDescr/sysUpTime/sysName.
- Configuration endpoint enriches system_name and caches last sysDescr.
- Monitoring: `/device-sessions/{id}/monitoring` returns metrics every second (synthetic variability for chart movement until real OIDs are mapped).

### 10. Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| METRO_SNMP_COMMUNITY | Default SNMP community used if none provided by client | public |
| METRO_SNMP_VERSION   | SNMP version hint ("2c" or "1") | auto (tries v2c then v1) |
| METRO_SNMP_PORT      | UDP port for SNMP | 161 |

Set (PowerShell example):
```
$env:METRO_SNMP_COMMUNITY = "public"
```

### 11. Managing the Backend Process (PowerShell Helper)
`manage_backend.ps1` actions:
```
pwsh ./manage_backend.ps1 -Action status
pwsh ./manage_backend.ps1 -Action start   -Port 8002 -Community public
pwsh ./manage_backend.ps1 -Action restart -Port 8002
pwsh ./manage_backend.ps1 -Action stop    -Port 8002
```
Shows health info when possible and prevents duplicate listeners.

### 12. Project Commands Reference
Frontend:
```
npm start        # Dev server (3000)
npm run build    # Production build
```
Backend:
```
uvicorn real_backend:app --host 0.0.0.0 --port 8002 --reload
```
SNMP Debugging:
```
curl -X POST http://localhost:8002/snmp/debug-get -H "Content-Type: application/json" -d '{"ip":"10.205.5.20","community":"public"}'
```
Discovery (targeted):
```
curl -X POST http://localhost:8002/wizard/discover -H "Content-Type: application/json" -d '{"ip":"10.205.5.20","community":"public"}'
```

### 13. Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| No devices found (broad scan) | 15-host cap missed your device | Use targeted IP in discovery input |
| Session start fails | Wrong community or SNMP disabled | Verify device SNMP config; try /snmp/probe-community |
| sysDescr empty | Device not responding or filtered | Check firewall / ACLs; confirm port 161 reachable |
| Backend restart not reflecting changes | Old process still bound | Use `manage_backend.ps1 -Action restart` and confirm status |
| pysnmp import error (Python 3.13) | Upstream compatibility issue | Raw fallback auto-engages; ignore unless needing advanced SNMP |

### 14. Roadmap / Next Enhancements
- Map real radioMode/channel/bandwidth/SSID OIDs
- Human-readable sysUpTime formatting
- Optional periodic auto-refresh toggle in UI
- SNMPv3 credential probing UI

---
### Contribution
Pull requests welcome (ensure descriptive commits). Keep focus: real devices only—no mock generators.

### License
Proprietary / Internal (adjust as needed).

---
If you need help extending discovery, integrating real performance OIDs, or deploying, open an issue or request assistance.
