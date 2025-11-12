# Transcoder Dashboard Implementation

## Overview
A dedicated UI for KeyWest Transcoder devices matching the reference screenshot design with a left sidebar and tabbed interface.

## What Was Implemented

### 1. Frontend Components

#### TranscoderDetail.jsx (`/MetroEMS-main/src/components/TranscoderDetail.jsx`)
Main component with:
- **Left Sidebar**:
  - Device image placeholder
  - Device type (T901)
  - Product (KeyWest)
  - IP Address
  - Hardware/Firmware versions
  - Connection status indicator

- **Main Content Area with 5 Tabs**:

##### Summary Tab
- **Qual Section**: Bitrate, Profile, Iptos, Type
- **RTSP/URL Section**: Cam1URL through Cam4URL with Edit buttons
- **System Information**: Vendor, Model, Firmware, IP, System Name, Uptime

##### Monitoring Tab
- **Key Metrics Cards**: CPU Usage, Memory Usage, Temperature, Input Signal (all with live indicators)
- **Performance Charts**: 
  - CPU & Memory line chart
  - Temperature line chart
- **Stream Status**: Input Signal and Output Stream status

##### Configuration Tab
- Editable form for:
  - Bitrate, Profile, IPTOS, Type
  - Camera 1-4 URLs
- Save button with backend integration

##### Firmware Tab
- Current firmware version display
- Firmware upload capability (disabled in demo mode)

##### Logs Tab
- Live log streaming with SSE
- Follow live checkbox
- Jump to bottom button
- Download logs functionality
- Color-coded log levels (INFO/WARN/ERROR)

### 2. Backend API Endpoints

#### Updated `/Backend_for_station_Radios/routers/transcoder.py`
Added new endpoints:

```python
GET  /transcoder/{ip}/summary     # Device summary with all key info
GET  /transcoder/{ip}/metrics     # Real-time metrics
GET  /transcoder/{ip}/config      # Get configuration
POST /transcoder/{ip}/config      # Update configuration
GET  /transcoder/{ip}/logs        # Get logs (existing)
```

#### Updated `/Backend_for_station_Radios/models/transcoder_models.py`
Added Pydantic models:
- `TranscoderSummary`: Complete device summary
- `TranscoderMetrics`: Real-time metrics data

### 3. Routing & Navigation

#### Updated `/MetroEMS-main/src/App.js`
- Added route: `/transcoder/:id` → `TranscoderDetail` component
- Imported `TranscoderDetail` component

#### Updated `/MetroEMS-main/src/components/Dashboard.jsx`
- Modified `handleDeviceClick()` to route Transcoder devices to `/transcoder/:id`
- Other device types still use generic `/device/:type/:id` route

### 4. Features

#### Real-time Data Polling
- Monitoring tab polls metrics every 5 seconds
- Charts maintain 60-second rolling window (MAX_POINTS = 60)
- Live indicators show when connected to real backend

#### Backend Integration
- Connects to session-based backend API
- Supports both live backend and demo mode
- Graceful fallback with demo data when backend unavailable

#### Logs Streaming
- SSE (Server-Sent Events) for live log tailing
- Auto-scroll with user control (follows tail)
- Manual scroll detection to pause auto-follow
- Download logs as text file

## Usage

### Starting the Application

1. **Start Backend**:
```bash
cd Backend_for_station_Radios
python real_backend.py
```

2. **Start Frontend**:
```bash
cd MetroEMS-main
npm start
```

3. **Navigate to Transcoder**:
   - Login to dashboard
   - Click "Transcoder" card
   - Click on a discovered transcoder device
   - You'll be routed to `/transcoder/{id}` with the dedicated UI

### Demo Mode
If backend is unavailable:
- Component shows demo data
- Status indicator shows "Demo Mode" (yellow)
- Configuration saves show alert but don't persist
- Charts show placeholder data

### Real Device Mode
When connected to backend with real transcoder:
- Status shows "Connected" (green)
- Live metrics update every 5s
- Logs stream in real-time via SSE
- Configuration changes persist to device
- Green pulse indicators on metric cards

## Architecture Patterns

### Consistent with MetroEMS Design
- Matches existing Station Radio management pattern
- Reuses apiService for backend communication
- Same authentication flow
- Consistent color scheme (blue gradients, cyan accents)
- Same tab structure across all device types

### Device-Specific Customization
- Transcoder has unique Summary layout (Qual + RTSP URLs)
- Monitoring shows transcoder-specific metrics
- Configuration form tailored to transcoder parameters

### Extensibility
- Easy to add more device types following same pattern
- Backend schema-driven approach
- Frontend renders based on backend data structure

## Key Files Modified/Created

### Created
- `/MetroEMS-main/src/components/TranscoderDetail.jsx` (870+ lines)
- `/TRANSCODER_IMPLEMENTATION.md` (this file)

### Modified
- `/MetroEMS-main/src/App.js` (added transcoder route)
- `/MetroEMS-main/src/components/Dashboard.jsx` (added routing logic)
- `/Backend_for_station_Radios/routers/transcoder.py` (added endpoints)
- `/Backend_for_station_Radios/models/transcoder_models.py` (added models)

## Design Alignment with Reference Screenshot

The implementation matches your reference screenshot:
- ✅ Left sidebar with device info and image
- ✅ Tabbed interface (View/Summary/Events mapped to Summary/Monitoring/Configuration/Firmware/Logs)
- ✅ Qual section with key parameters
- ✅ RTSP/URL section with camera URLs
- ✅ Charts for performance monitoring
- ✅ Clean, professional UI with consistent styling

## Next Steps (Optional Enhancements)

1. **Add Events Tab**: Create event history log separate from system logs
2. **Stream Preview**: Add video stream preview for RTSP URLs
3. **Bitrate Charts**: Add historical bitrate charts in Monitoring
4. **Alarm Thresholds**: Configure CPU/temp/signal alarms
5. **Firmware History**: Track firmware upgrade history
6. **Multi-camera Grid**: Show all 4 camera streams simultaneously

## Testing Checklist

- [ ] Navigate from dashboard to transcoder detail page
- [ ] Verify all tabs load without errors
- [ ] Check Summary tab shows device info
- [ ] Confirm Monitoring tab updates metrics
- [ ] Test Configuration save (demo and real modes)
- [ ] Verify Logs tab streams and downloads
- [ ] Check responsive design on different screen sizes
- [ ] Test SSE connection/reconnection
- [ ] Verify graceful degradation when backend offline

## Troubleshooting

**Issue**: Transcoder not appearing in device list
- **Solution**: Ensure backend discovery is running and transcoder IP is accessible

**Issue**: Metrics not updating
- **Solution**: Check browser console for API errors, verify session ID in URL

**Issue**: Logs not streaming
- **Solution**: Verify SSE endpoint `/api/devices/{ip}/logs/stream`, check CORS settings

**Issue**: Charts not rendering
- **Solution**: Ensure recharts is installed: `npm install recharts`

## Notes

- Component uses React Hooks (useState, useEffect, useRef)
- Recharts library for data visualization
- Lucide React for consistent icons
- Tailwind CSS for styling (matching existing theme)
- TypeScript types can be added for better type safety
