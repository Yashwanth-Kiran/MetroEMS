# Encoder API Reference

## Base URL
```
http://localhost:8002
```

## Authentication
All endpoints require authentication token in header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Get Encoder Summary
Retrieve comprehensive device information including Quad, RTSP, and HDMI settings.

**Endpoint**: `GET /encoder/{ip}/summary`

**Parameters**:
- `ip` (path): Device IP address (e.g., "192.168.77.14")

**Response**:
```json
{
  "device_ip": "192.168.77.14",
  "device_type": "Encoder",
  "model": "E801",
  "firmware_version": "2.8.4",
  "hardware_version": "Rev C",
  "serial_number": "ENC123456",
  "uptime": "15 days 4 hours",
  "status": "online",
  "quad": {
    "encoder": "H.264",
    "profile": "main",
    "xpos": "0",
    "ypos": "0"
  },
  "rtsp": {
    "camIdUrl": "rtsp://192.168.1.100:554/stream1",
    "camIdUrl2": "rtsp://192.168.1.101:554/stream1",
    "camIdUrl3": "rtsp://192.168.1.102:554/stream1",
    "camIdUrl4": "rtsp://192.168.1.103:554/stream1"
  },
  "hdmi": {
    "inputStatus": "Connected",
    "resolution": "1920x1080"
  }
}
```

**Status Codes**:
- `200 OK`: Success
- `404 Not Found`: Device not found

---

### 2. Get Real-time Metrics
Retrieve current performance metrics for the encoder.

**Endpoint**: `GET /encoder/{ip}/metrics`

**Parameters**:
- `ip` (path): Device IP address

**Response**:
```json
{
  "device_ip": "192.168.77.14",
  "cpu_usage": 45.2,
  "memory_usage": 58.7,
  "temperature": 52.3,
  "bandwidth": 42.8,
  "input_bitrate": 4200.5,
  "output_bitrate": 4050.2,
  "dropped_frames": 3,
  "timestamp": "2025-11-12T10:30:45.123456"
}
```

**Notes**:
- Values update in real-time
- Demo devices return simulated data
- Temperature in Celsius
- Bandwidth in Mbps
- Bitrates in Kbps

**Status Codes**:
- `200 OK`: Success

---

### 3. Get Configuration
Retrieve current device configuration settings.

**Endpoint**: `GET /encoder/{ip}/config`

**Parameters**:
- `ip` (path): Device IP address

**Response**:
```json
{
  "resolution": "1920x1080",
  "framerate": "30",
  "bitrate": "4000",
  "codec": "H.264",
  "ip_address": "192.168.77.14",
  "subnet_mask": "255.255.255.0",
  "gateway": "192.168.77.1",
  "multicast_address": "239.1.1.1",
  "protocol": "RTSP",
  "port": "554",
  "stream_name": "stream1",
  "encryption": "None",
  "audio_codec": "AAC",
  "sample_rate": "48000",
  "channels": "2",
  "audio_bitrate": "128"
}
```

**Status Codes**:
- `200 OK`: Success

---

### 4. Update Configuration
Update device configuration settings.

**Endpoint**: `POST /encoder/{ip}/config`

**Parameters**:
- `ip` (path): Device IP address

**Request Body**:
```json
{
  "config": {
    "resolution": "1920x1080",
    "framerate": "60",
    "bitrate": "8000",
    "codec": "H.265"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Configuration updated successfully",
  "device_ip": "192.168.77.14",
  "updated_fields": ["resolution", "framerate", "bitrate", "codec"]
}
```

**Notes**:
- Only include fields you want to update
- Demo devices simulate the update
- Real devices require SNMP write access

**Status Codes**:
- `200 OK`: Success
- `501 Not Implemented`: Non-demo device configuration not supported

---

### 5. Get Device Logs
Retrieve device logs with optional filtering.

**Endpoint**: `GET /encoder/{ip}/logs`

**Parameters**:
- `ip` (path): Device IP address
- `level` (query, optional): Filter by log level (INFO, WARNING, ERROR)
- `limit` (query, optional): Maximum number of logs (default: 100)

**Example Requests**:
```
GET /encoder/192.168.77.14/logs
GET /encoder/192.168.77.14/logs?level=ERROR
GET /encoder/192.168.77.14/logs?limit=50
GET /encoder/192.168.77.14/logs?level=WARNING&limit=25
```

**Response**:
```json
{
  "device_ip": "192.168.77.14",
  "logs": [
    {
      "timestamp": "2025-11-12T10:30:45.123456",
      "level": "INFO",
      "message": "Encoder stream started successfully",
      "source": "encoder"
    },
    {
      "timestamp": "2025-11-12T10:30:40.456789",
      "level": "WARNING",
      "message": "High CPU usage detected",
      "source": "encoder"
    },
    {
      "timestamp": "2025-11-12T10:30:35.789012",
      "level": "ERROR",
      "message": "RTSP stream connection timeout",
      "source": "encoder"
    }
  ],
  "total_count": 3
}
```

**Log Levels**:
- `INFO`: Informational messages
- `WARNING`: Warning conditions
- `ERROR`: Error conditions

**Status Codes**:
- `200 OK`: Success

---

## Discovery & Session Management

### Discover Encoders
**Endpoint**: `POST /wizard/discover`

**Request Body**:
```json
{
  "device_type": "encoder",
  "ip": "192.168.77.12",
  "community": "public"
}
```

**Response**:
```json
{
  "candidates": [
    {
      "ip": "192.168.77.14",
      "hint": "encoder",
      "description": "KeyWest E801 Encoder v2.8.4 (Demo)",
      "device_type": "Encoder",
      "system_name": "Demo-Encoder-01"
    },
    {
      "ip": "192.168.77.15",
      "hint": "encoder",
      "description": "KeyWest E801 Encoder v2.8.4 (Demo)",
      "device_type": "Encoder",
      "system_name": "Demo-Encoder-02"
    }
  ],
  "message": "Found 2 demo encoder device(s) for testing",
  "real_device_detection": false,
  "demo_mode": true,
  "device_type": "encoder",
  "total_devices_found": 2
}
```

---

### Start Session
**Endpoint**: `POST /session/start`

**Request Body**:
```json
{
  "ip": "192.168.77.14",
  "device_type": "encoder",
  "username": "admin"
}
```

**Response**:
```json
{
  "session_id": 1,
  "device_ip": "192.168.77.14",
  "device_type": "encoder",
  "status": "active",
  "message": "Session started successfully"
}
```

---

## Data Models

### EncoderSummary
```typescript
{
  device_ip: string
  device_type: string
  model?: string
  firmware_version?: string
  hardware_version?: string
  serial_number?: string
  uptime?: string
  status: string
  quad?: {
    encoder?: string
    profile?: string
    xpos?: string
    ypos?: string
  }
  rtsp?: {
    camIdUrl?: string
    camIdUrl2?: string
    camIdUrl3?: string
    camIdUrl4?: string
  }
  hdmi?: {
    inputStatus?: string
    resolution?: string
  }
}
```

### EncoderMetrics
```typescript
{
  device_ip: string
  cpu_usage: number
  memory_usage: number
  temperature: number
  bandwidth: number
  input_bitrate?: number
  output_bitrate?: number
  dropped_frames: number
  timestamp?: string
}
```

### EncoderConfig
```typescript
{
  resolution?: string
  framerate?: string
  bitrate?: string
  codec?: string
  ip_address?: string
  subnet_mask?: string
  gateway?: string
  multicast_address?: string
  protocol?: string
  port?: string
  stream_name?: string
  encryption?: string
  audio_codec?: string
  sample_rate?: string
  channels?: string
  audio_bitrate?: string
}
```

---

## Error Responses

### 404 Not Found
```json
{
  "detail": "Device not found"
}
```

### 501 Not Implemented
```json
{
  "detail": "Configuration update not implemented for non-demo devices"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error message"
}
```

---

## Demo Device Specifications

### Demo IP Range
- **Range**: `192.168.77.x`
- **Devices**: 
  - `192.168.77.14` - Demo-Encoder-01
  - `192.168.77.15` - Demo-Encoder-02

### Demo Capabilities
- ✅ Full API support
- ✅ Simulated metrics
- ✅ Configuration read/write
- ✅ Log generation
- ✅ Session management
- ❌ No SNMP verification required
- ❌ No actual hardware control

---

## Testing with cURL

### Get Summary
```bash
curl -X GET http://localhost:8002/encoder/192.168.77.14/summary \
  -H "Authorization: Bearer <token>"
```

### Get Metrics
```bash
curl -X GET http://localhost:8002/encoder/192.168.77.14/metrics \
  -H "Authorization: Bearer <token>"
```

### Update Configuration
```bash
curl -X POST http://localhost:8002/encoder/192.168.77.14/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "resolution": "1920x1080",
      "framerate": "60"
    }
  }'
```

### Get Logs
```bash
curl -X GET "http://localhost:8002/encoder/192.168.77.14/logs?level=ERROR&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## Rate Limiting
Currently no rate limiting implemented. Future versions may include:
- Max 100 requests per minute per IP
- Max 10 configuration updates per minute

## Versioning
- Current API Version: v1
- Encoder Router Version: 1.0.0
- Backend Version: 2.x

## Support
For API issues or questions:
- Check backend logs: Terminal running `real_backend.py`
- Review ENCODER_IMPLEMENTATION.md
- Test with demo devices first

---

**Last Updated**: November 12, 2025  
**API Status**: ✅ Production Ready (Demo Mode)
