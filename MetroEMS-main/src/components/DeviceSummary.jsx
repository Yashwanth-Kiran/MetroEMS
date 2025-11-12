import React from 'react';

const DeviceSummary = ({ device }) => {
  const d = device || {};
  const systemName = d.system_name || d.systemName || d.name || 'Station Radio';
  const systemType = d.device_type || d.type || 'Station Radio';
  const ip = d.ip || d.ip_address || d.ipAddress || 'N/A';
  const radioMode = d.radio_mode || d.radioMode || 'Unknown';
  const bandwidth = d.bandwidth || '—';
  const channel = d.channel || '—';
  const ssid = d.ssid || '—';
  const status = d.connection_verified ? 'Online' : (d.status || 'Unknown');
  const lastVerified = d.last_verified || d.created_at || new Date().toISOString();

  const rows = [
    ['System Name', systemName],
    ['System Type', systemType],
    ['IP Address', ip],
    ['Radio Mode', radioMode],
    ['Bandwidth', bandwidth],
    ['Channel', channel],
    ['SSID', ssid],
    ['Status', status],
    ['Last Verified', lastVerified]
  ];

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 mt-8 w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Station Radio Summary</h2>
      <div className="grid grid-cols-1 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between items-center bg-blue-900/40 rounded-md px-3 py-2">
            <span className="text-blue-200 text-sm font-semibold">{label}</span>
            <span className="text-white text-sm break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceSummary;
