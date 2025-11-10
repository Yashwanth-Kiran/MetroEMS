// Unified device UI schema definitions
// Each device type lists summary field keys and monitoring widgets.
// Frontend renders labels + values; if value is null/undefined, show '—'.

export const DEVICE_TYPES = [
  'station_radio',
  'train_radio',
  'transcoder',
  'obc',
  'io_box',
  'encoder'
];

const baseSummary = [
  { key: 'ip', label: 'IP Address' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'model', label: 'Model' },
  { key: 'firmware', label: 'Firmware Version' },
  { key: 'uptimeSeconds', label: 'Uptime (s)' },
  { key: 'lastSeen', label: 'Last Seen' },
];

export const deviceSchemas = {
  station_radio: {
    summaryLeft: [
      { key: 'sysName', label: 'System Name' },
      { key: 'sysDescr', label: 'System Description' },
      ...baseSummary,
      { key: 'online', label: 'Connection Status' },
    ],
    summaryRight: [
      { key: 'radio_mode', label: 'Radio Mode' },
      { key: 'channel', label: 'Channel' },
      { key: 'bandwidthMHz', label: 'Bandwidth (MHz)' },
      { key: 'txPowerDbm', label: 'Tx Power (dBm)' },
      { key: 'rssiDbm', label: 'RSSI (dBm)' },
      { key: 'snrDb', label: 'SNR (dB)' },
      { key: 'txRateMbps', label: 'TX Rate (Mbps)' },
      { key: 'rxRateMbps', label: 'RX Rate (Mbps)' },
    ],
    monitoringWidgets: ['rssiChart','snrChart','throughputChart','cpuTile','memTile','latencyTile']
  },
  transcoder: {
    summaryLeft: [
      { key: 'name', label: 'Name' },
      ...baseSummary,
      { key: 'hardwareVersion', label: 'Hardware Version' },
      { key: 'uptimeSeconds', label: 'Uptime (s)' },
    ],
    summaryRight: [
      { key: 'inputStatus', label: 'Input Status' },
      { key: 'outputStatus', label: 'Output Status' },
      { key: 'streamBitrateKbps', label: 'Stream Bitrate (kbps)' },
      { key: 'errors', label: 'Errors Count' },
    ],
    monitoringWidgets: ['cpuChart','memChart','bitrateChart','errorsChart']
  },
  obc: {
    summaryLeft: [
      { key: 'cabId', label: 'Cab / Train ID' },
      ...baseSummary,
      { key: 'diskUsedPct', label: 'Disk Used %' },
      { key: 'ntpServer', label: 'NTP Server' },
    ],
    summaryRight: [
      { key: 'cpuPercent', label: 'CPU %' },
      { key: 'memPercent', label: 'Memory %' },
      { key: 'diskFreeGb', label: 'Disk Free (GB)' },
      { key: 'latencyMs', label: 'Network Latency (ms)' },
    ],
    monitoringWidgets: ['cpuChart','memChart','diskChart','latencyChart']
  },
  io_box: {
    summaryLeft: [
      { key: 'name', label: 'Name' },
      ...baseSummary,
      { key: 'inputs', label: 'Inputs' },
      { key: 'outputs', label: 'Outputs' },
    ],
    summaryRight: [
      { key: 'channelStates', label: 'Channel States' },
    ],
    monitoringWidgets: ['stateTimeline']
  },
  encoder: {
    summaryLeft: [
      { key: 'name', label: 'Name' },
      ...baseSummary,
      { key: 'uptimeSeconds', label: 'Uptime (s)' },
    ],
    summaryRight: [
      { key: 'streamUrls', label: 'Stream URLs' },
      { key: 'bitrateKbps', label: 'Bitrate (kbps)' },
      { key: 'packetLossPct', label: 'Packet Loss %' },
      { key: 'errors', label: 'Errors' },
    ],
    monitoringWidgets: ['bitrateChart','lossChart','errorsChart']
  }
};

export function normalizeSummary(raw = {}, deviceType = 'station_radio') {
  // Accept both summary from /session/:id/summary and potential future /api/devices/:id/summary
  const out = { ...raw };
  // Map known nested structures
  if (raw.identity) {
    out.vendor = raw.identity.vendor || out.vendor;
    out.model = raw.identity.model || out.model;
  }
  // Provide standard placeholders
  const schema = deviceSchemas[deviceType] || deviceSchemas.station_radio;
  [...schema.summaryLeft, ...schema.summaryRight].forEach(f => {
    if (out[f.key] === undefined) out[f.key] = null;
  });
  return out;
}
