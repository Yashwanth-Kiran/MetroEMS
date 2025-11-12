# Transcoder API Reference

## Base URL
```
http://localhost:8000
```

## Endpoints

### 1. Get Transcoder Summary
```http
GET /transcoder/{ip}/summary
```

**Response**:
```json
{
  "ip": "192.168.66.12",
  "type": "transcoder",
  "vendor": "KeyWest",
  "model": "T901",
  "name": "KeyWest Transcoder",
  "sysName": "Transcoder-01",
  "sysDescr": "KeyWest T901 v2.5.2",
  "firmware": "2.5.2",
  "hardwareVersion": "3.2.12.1",
  "uptimeSeconds": 345600,
  "online": true,
  "cpu": 12.5,
  "memory": 45.2,
  "temperature": 42.3,
  "inputSignal": "Active",
  "outputStream": "Streaming"
}
```

### 2. Get Current Metrics
```http
GET /transcoder/{ip}/metrics
```

**Response**:
```json
{
  "timestamp": "2025-11-10T12:34:56.789Z",
  "cpu": 12.5,
  "memory": 45.2,
  "temperature": 42.3,
  "inputSignal": "Active",
  "outputStream": "Streaming",
  "bitrate": 5000
}
```

### 3. Get Configuration
```http
GET /transcoder/{ip}/config
```

**Response**:
```json
{
  "bitrate": "5000",
  "profile": "High",
  "iptos": "184",
  "type": "H.264",
  "cam1URL": "rtsp://192.168.66.129/1234/h264multicast/4567.sdp",
  "cam2URL": "rtsp://192.168.66.129/1234/h264multicast/4568.sdp",
  "cam3URL": "rtsp://192.168.66.129/1234/h264multicast/4569.sdp",
  "cam4URL": "rtsp://192.168.66.129/1234/h264multicast/4570.sdp",
  "video_input": "HDMI",
  "video_output": "IP",
  "encoding_profile": "Main",
  "resolution": "1920x1080",
  "frame_rate": "30"
}
```

### 4. Update Configuration
```http
POST /transcoder/{ip}/config
Content-Type: application/json
```

**Request Body**:
```json
{
  "bitrate": "6000",
  "profile": "High",
  "iptos": "184",
  "type": "H.264",
  "cam1URL": "rtsp://192.168.66.129/1234/h264multicast/4567.sdp"
}
```

**Response**: Same as GET /config (updated values)

### 5. Get Logs
```http
GET /transcoder/{ip}/logs?since=2025-11-10&search=error
```

**Query Parameters**:
- `since` (required): ISO date (YYYY-MM-DD)
- `search` (optional): Filter logs by text

**Response**:
```json
{
  "ip": "192.168.66.12",
  "since": "2025-11-10",
  "search": "error",
  "entries": [
    {
      "timestamp": "2025-11-10T10:30:00Z",
      "level": "INFO",
      "message": "Transcoder started successfully"
    },
    {
      "timestamp": "2025-11-10T10:31:00Z",
      "level": "ERROR",
      "message": "Connection timeout on camera 2"
    }
  ]
}
```

## Session-Based Endpoints

The frontend also uses session-based endpoints for device management:

### Start Device Session
```http
POST /api/session/start
Content-Type: application/json
```

**Request**:
```json
{
  "ip": "192.168.66.12",
  "device_type": "transcoder",
  "user": "technician1",
  "credentials": {
    "community": "public"
  }
}
```

**Response**:
```json
{
  "session_id": "sess_12345"
}
```

### Get Session Info
```http
GET /api/session/{session_id}
```

**Response**:
```json
{
  "session_id": "sess_12345",
  "device_info": {
    "ip_address": "192.168.66.12",
    "device_type": "transcoder",
    "name": "Transcoder-01"
  },
  "created_at": "2025-11-10T10:00:00Z",
  "status": "active"
}
```

### Get Unified Device Summary
```http
GET /api/session/{session_id}/summary
```

**Response**: Combined device info from session + transcoder-specific data

### Get Device Configuration
```http
GET /api/session/{session_id}/configuration
```

### Update Device Configuration
```http
PUT /api/session/{session_id}/configuration
Content-Type: application/json
```

### Metrics Time Series
```http
GET /api/metrics/series?deviceIp={ip}&metric={metric_name}&mins={minutes}
```

**Query Parameters**:
- `deviceIp`: Device IP address
- `metric`: Metric name (cpu, memory, temperature, etc.)
- `mins`: Time window in minutes

**Response**:
```json
[
  {
    "timestamp": "2025-11-10T12:30:00Z",
    "value": 12.5
  },
  {
    "timestamp": "2025-11-10T12:31:00Z",
    "value": 13.2
  }
]
```

### Logs Stream (SSE)
```http
GET /api/devices/{ip}/logs/stream?since={iso_timestamp}
```

**Response**: Server-Sent Events stream
```
data: {"time":"2025-11-10T12:34:56Z","type":"INFO","message":"Stream started"}

data: {"time":"2025-11-10T12:35:00Z","type":"WARN","message":"High temperature detected"}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "detail": "Failed to get transcoder summary: Connection refused"
}
```

**Common Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (device not found)
- `502`: Bad Gateway (device not responding)
- `500`: Internal Server Error

## SNMP Integration

The transcoder endpoints use SNMP internally. Make sure:
1. Device SNMP is enabled
2. Community string is correct (default: "public")
3. Device is reachable on the network
4. Firewall allows UDP port 161

## Frontend Usage Example

```javascript
import { apiService } from '../services/apiService';

// Get transcoder summary
const summary = await apiService.getUnifiedDeviceSummary(sessionId, 'transcoder');

// Get real-time metrics
const metrics = await apiService.getMetricSeries({
  deviceIp: '192.168.66.12',
  metric: 'cpu',
  mins: 5
});

// Update configuration
await apiService.updateDeviceConfiguration(sessionId, {
  bitrate: '6000',
  profile: 'High'
});

// Stream logs
const eventSource = apiService.createLogsEventSource({
  deviceIp: '192.168.66.12',
  since: new Date(Date.now() - 60000).toISOString()
});

eventSource.onmessage = (event) => {
  const logEntry = JSON.parse(event.data);
  console.log(logEntry);
};
```

## Testing with curl

```bash
# Get summary
curl http://localhost:8000/transcoder/192.168.66.12/summary

# Get metrics
curl http://localhost:8000/transcoder/192.168.66.12/metrics

# Get config
curl http://localhost:8000/transcoder/192.168.66.12/config

# Update config
curl -X POST http://localhost:8000/transcoder/192.168.66.12/config \
  -H "Content-Type: application/json" \
  -d '{"bitrate": "6000"}'

# Get logs
curl "http://localhost:8000/transcoder/192.168.66.12/logs?since=2025-11-10&search=error"
```
