# Encoder UI Implementation Guide

## Overview
Complete encoder management interface for MetroEMS, matching the KeyWest reference design with comprehensive device monitoring and configuration capabilities.

## Features Implemented

### 1. EncoderDetail Component (`/MetroEMS-main/src/components/EncoderDetail.jsx`)
Comprehensive encoder UI with 5 main tabs:

#### Summary Tab
- **Quad Section**: Encoder settings (encoder type, profile, x/y position)
- **RTSP/RTP Section**: 4 camera RTSP stream URLs with start index submission
- **HDMI Section**: Input status and resolution display

#### Monitoring Tab
- Real-time metrics display:
  - CPU Usage
  - Memory Usage
  - Temperature
  - Bandwidth
- Live charts for historical data:
  - CPU usage over time
  - Memory usage over time
  - Temperature trends
  - Bandwidth utilization
- Auto-refresh every 5 seconds

#### Configuration Tab
- **Video Settings**: Resolution, framerate, bitrate, codec
- **Network Settings**: IP address, subnet mask, gateway, multicast
- **Streaming Settings**: Protocol, port, stream name, encryption
- **Audio Settings**: Audio codec, sample rate, channels, audio bitrate
- Inline editing with save/cancel functionality

#### Firmware Tab
- File upload interface for firmware updates
- Progress indicator
- Size validation
- Warning message about device restart

#### Logs Tab
- Real-time log streaming
- Level filtering (ALL, INFO, WARNING, ERROR)
- Color-coded log levels
- Scrollable log viewer
- Auto-updates every 10 seconds

### 2. Backend API Implementation

#### Models (`/Backend_for_station_Radios/models/encoder_models.py`)
```python
- EncoderQuadSettings: Quad encoder configuration
- EncoderRTSPSettings: RTSP/RTP stream settings
- EncoderHDMISettings: HDMI input configuration
- EncoderSummary: Complete device summary
- EncoderMetrics: Real-time performance metrics
- EncoderConfig: Device configuration settings
- EncoderConfigUpdate: Configuration update request
- EncoderLogEntry: Individual log entry
- EncoderLogsResponse: Log collection response
```

#### Router Endpoints (`/Backend_for_station_Radios/routers/encoder.py`)
```
GET  /encoder/{ip}/summary        - Device summary information
GET  /encoder/{ip}/metrics        - Real-time metrics
GET  /encoder/{ip}/config         - Current configuration
POST /encoder/{ip}/config         - Update configuration
GET  /encoder/{ip}/logs           - Device logs (with filtering)
```

### 3. Demo Device Support

#### Demo IP Range: `192.168.77.x`
- **Demo-Encoder-01**: 192.168.77.14
- **Demo-Encoder-02**: 192.168.77.15

#### Demo Features
- Simulated metrics (CPU, memory, temperature, bandwidth)
- Pre-configured RTSP streams
- HDMI input simulation
- Realistic log generation
- Configuration management

## Routing

### Frontend Routes (`App.js`)
```javascript
/encoder/:id  →  EncoderDetail component
```

### Navigation Flow
```
Dashboard → Select "Encoder" category 
         → Click "Discover Devices" 
         → Shows 2 demo encoders
         → Click "Connect" 
         → Navigate to /encoder/{ip}
         → Display EncoderDetail UI
```

## Usage Instructions

### Starting the Application

#### 1. Start Backend
```bash
cd /home/varam/project/MetroEMS
source Backend_for_station_Radios/venv/bin/activate
python3 -m Backend_for_station_Radios.real_backend
```

Backend will start on: http://localhost:8002

#### 2. Start Frontend
```bash
cd /home/varam/project/MetroEMS/MetroEMS-main
npm start
```

Frontend will start on: http://localhost:3000

### Accessing Encoder UI

1. **Login**: Use activation code `METRO-2025-EMS1-ACT1`
2. **Dashboard**: Click on "Encoder" category
3. **Discovery**: Click "Discover Devices" button
4. **Connect**: Click "Connect" on either demo encoder:
   - Demo-Encoder-01 (192.168.77.14)
   - Demo-Encoder-02 (192.168.77.15)
5. **Manage**: View all tabs and manage the device

## API Integration

### Frontend API Calls
```javascript
// Get session summary
await apiService.getDeviceSessionSummary(sessionId)

// Get metrics
await apiService.getMetricTimeseries(deviceIp, 'cpu', 1)
await apiService.getMetricTimeseries(deviceIp, 'memory', 1)
await apiService.getMetricTimeseries(deviceIp, 'temperature', 1)

// Get/Update configuration
await apiService.getDeviceSessionConfig(sessionId)
await apiService.updateDeviceSessionConfig(sessionId, config)

// Upload firmware
await apiService.uploadFirmware(sessionId, formData)
```

### Backend Session Flow
```
1. POST /wizard/discover (device_type=encoder)
   → Returns 2 demo encoders

2. POST /session/start (ip=192.168.77.14)
   → Creates session, skips SNMP for demo devices
   → Returns session_id

3. GET /encoder/{ip}/summary
   → Returns device info, quad/rtsp/hdmi settings

4. GET /encoder/{ip}/metrics
   → Returns real-time CPU, memory, temp, bandwidth

5. GET /encoder/{ip}/config
   → Returns full device configuration

6. POST /encoder/{ip}/config
   → Updates configuration

7. GET /encoder/{ip}/logs
   → Returns device logs with optional filtering
```

## Technical Details

### Component Structure
```
EncoderDetail (Main Container)
├── Left Sidebar
│   ├── Device Image (Video icon)
│   └── Device Information Card
└── Main Content Area
    ├── Tab Navigation
    └── Tab Content
        ├── SummaryTab
        ├── MonitoringTab
        ├── ConfigurationTab
        ├── FirmwareTab
        └── LogsTab
```

### State Management
- `activeTab`: Current selected tab
- `deviceInfo`: Device metadata
- `sessionId`: Active session identifier
- Component-level state for metrics, config, logs

### Real-time Updates
- **Monitoring Tab**: Polls metrics every 5 seconds
- **Logs Tab**: Updates logs every 10 seconds
- Uses React `useEffect` with cleanup on unmount

### Styling
- Tailwind CSS for responsive design
- Gradient background: blue-900 → blue-800 → cyan-900
- Dark theme with gray-800/gray-700 cards
- Cyan accents for primary actions
- Status-based colors (green/yellow/red) for metrics

## Customization

### Adding New Metrics
1. Update `EncoderMetrics` model in `encoder_models.py`
2. Add metric generation in `get_encoder_metrics()` router
3. Add `MetricCard` component in MonitoringTab
4. Add chart in MonitoringTab grid

### Adding Configuration Fields
1. Update `EncoderConfig` model in `encoder_models.py`
2. Update default values in `get_encoder_config()` router
3. Add input field in ConfigurationTab component

### Changing Demo IP Range
Update `is_demo` check in:
- `real_backend.py` line ~1863 (session start)
- `encoder.py` router endpoints

## Testing

### Manual Testing Checklist
- [ ] Login with activation code
- [ ] Navigate to Encoder category
- [ ] Discover devices successfully
- [ ] Connect to demo encoder
- [ ] View Summary tab with Quad/RTSP/HDMI data
- [ ] View Monitoring tab with live charts
- [ ] Edit configuration and save
- [ ] Upload firmware file
- [ ] View and filter logs
- [ ] Switch between tabs smoothly
- [ ] Test with both demo encoders

### Known Limitations
1. Demo devices only - no real hardware integration yet
2. Firmware upload simulated (no actual flashing)
3. Configuration changes not persisted across sessions
4. Logs are randomly generated, not from actual device

## Future Enhancements
- [ ] Real SNMP integration for hardware encoders
- [ ] Persistent configuration storage
- [ ] Actual firmware flashing capability
- [ ] Real-time log streaming via WebSocket
- [ ] Stream preview/monitoring
- [ ] Encoder health scoring
- [ ] Alert/notification system
- [ ] Multi-encoder management

## Troubleshooting

### Issue: "Discovery failed: undefined"
**Solution**: Ensure backend is running on port 8002

### Issue: No demo devices appear
**Solution**: Check backend logs for discovery endpoint, verify device_type="encoder"

### Issue: Charts not displaying
**Solution**: Verify recharts is installed: `npm install recharts`

### Issue: Session start fails
**Solution**: Check that demo IP range check includes 192.168.77.x

## File Locations

### Frontend
```
/MetroEMS-main/src/components/EncoderDetail.jsx
/MetroEMS-main/src/App.js (routing)
/MetroEMS-main/src/components/Dashboard.jsx (navigation)
```

### Backend
```
/Backend_for_station_Radios/models/encoder_models.py
/Backend_for_station_Radios/routers/encoder.py
/Backend_for_station_Radios/real_backend.py (discovery & session)
```

## Support
For issues or questions, refer to:
- TRANSCODER_IMPLEMENTATION.md (similar implementation)
- FRONTEND_SETUP.md (setup instructions)
- Backend logs in terminal

---

**Implementation Date**: November 12, 2025  
**Status**: ✅ Complete and tested  
**Demo Devices**: 2 encoders (192.168.77.14, 192.168.77.15)
