import React, { useState, useEffect } from 'react';
import DeviceSummary from './DeviceSummary';
import { ArrowLeft, Settings, Activity, UploadCloud, FileText, Trash2, Download } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const tabs = [
  { name: 'Configuration', icon: <Settings size={18} /> },
  { name: 'Monitoring', icon: <Activity size={18} /> },
  { name: 'Firmware', icon: <UploadCloud size={18} /> },
  { name: 'Logs', icon: <FileText size={18} /> },
];

const initialConfig = {
  systemName: 'Station Radios-001',
  ipAddress: '192.168.1.100',
  ssid: 'MetroNet-5G',
  bandwidth: '20MHz',
  channel: 'Auto',
  radioMode: 'Access Point',
};

const bandwidthOptions = ['20MHz', '40MHz', '80MHz'];
const channelOptions = ['Auto', '1', '6', '11'];
const radioModeOptions = ['Access Point', 'Client', 'Repeater'];

const initialLogs = [
  {
    time: '[8/11/2025, 12:44:00 PM]',
    type: 'INFO',
    message: 'Station Radios initialized successfully',
  },
  {
    time: '[8/11/2025, 12:44:00 PM]',
    type: 'INFO',
    message: 'Network connection established',
  },
  {
    time: '[8/11/2025, 12:44:00 PM]',
    type: 'WARN',
    message: 'Signal strength below optimal threshold',
  },
];

const DeviceManagement = () => {
  const [activeTab, setActiveTab] = useState('Configuration');
  const [config, setConfig] = useState(initialConfig);
  const [monitoring, setMonitoring] = useState({
    signal: 77.04,
    snr: 43.4,
    tx: 139,
    rx: 113,
  });
  const [logs, setLogs] = useState(initialLogs);
  const navigate = useNavigate();
  const { type } = useParams();

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    alert('Configuration saved!\n' + JSON.stringify(config, null, 2));
  };

  const handleDownload = () => {
    const logText = logs.map(log => `${log.time} ${log.type}: ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system_logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => setLogs([]);

  useEffect(() => {
    if (activeTab !== 'Monitoring') return;
    const interval = setInterval(() => {
      setMonitoring({
        signal: (70 + Math.random() * 10).toFixed(2),
        snr: (40 + Math.random() * 10).toFixed(1),
        tx: Math.floor(120 + Math.random() * 40),
        rx: Math.floor(100 + Math.random() * 30),
      });
    }, 1000); // Changed from 1500 to 1000 ms (1 second)
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-blue-200 hover:text-white font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white flex-1">
            {type ? `${type.replace(/-/g, ' ')} Management` : 'Device Management'}
          </h2>
        </div>
        <div className="flex border-b border-blue-700 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition
                ${activeTab === tab.name
                  ? 'text-cyan-300 border-b-2 border-cyan-300'
                  : 'text-blue-200 hover:text-white border-b-2 border-transparent'
                }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>
        {/* Tab Content */}
        {activeTab === 'Configuration' && (
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSave}>
            <div>
              <label className="block text-blue-100 mb-2">System Name</label>
              <input
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="systemName"
                value={config.systemName}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-blue-100 mb-2">Channel</label>
              <select
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="channel"
                value={config.channel}
                onChange={handleChange}
              >
                {channelOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-blue-100 mb-2">IP Address</label>
              <input
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="ipAddress"
                value={config.ipAddress}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-blue-100 mb-2">Radio Mode</label>
              <select
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="radioMode"
                value={config.radioMode}
                onChange={handleChange}
              >
                {radioModeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-blue-100 mb-2">SSID</label>
              <input
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="ssid"
                value={config.ssid}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-blue-100 mb-2">Bandwidth</label>
              <select
                className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
                name="bandwidth"
                value={config.bandwidth}
                onChange={handleChange}
              >
                {bandwidthOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end mt-4">
              <button
                type="submit"
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold px-6 py-2 rounded-md shadow hover:from-cyan-500 hover:to-blue-600 transition"
              >
                Save Configuration
              </button>
            </div>
          </form>
        )}

        {activeTab === 'Monitoring' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start">
                <div className="text-blue-100 text-sm mb-2">Signal Strength</div>
                <div className="text-2xl font-bold text-white">{monitoring.signal}%</div>
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start">
                <div className="text-blue-100 text-sm mb-2">SNR</div>
                <div className="text-2xl font-bold text-white">{monitoring.snr} dB</div>
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start">
                <div className="text-blue-100 text-sm mb-2">TX Rate</div>
                <div className="text-2xl font-bold text-white">{monitoring.tx} Mbps</div>
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start">
                <div className="text-blue-100 text-sm mb-2">RX Rate</div>
                <div className="text-2xl font-bold text-white">{monitoring.rx} Mbps</div>
              </div>
            </div>
            <div className="bg-blue-900/60 rounded-xl p-8 mt-4">
              <div className="text-blue-100 mb-2 font-semibold">Network Performance</div>
              <div className="h-40 flex items-center justify-center text-blue-300 text-sm">
                Live SNR &amp; TX/RX Graph Display
              </div>
            </div>
            {/* Static Device Summary below live metrics */}
            <DeviceSummary />
          </div>
        )}

        {activeTab === 'Firmware' && (
          <div>
            <div className="bg-blue-900/60 rounded-xl p-6 mb-8">
              <div className="text-blue-100 text-lg font-semibold mb-2">Current Firmware</div>
              <div className="text-white mb-1">Version: <span className="font-bold">v2.1.4</span></div>
              <div className="text-white mb-1">Build Date: <span className="font-bold">2024-12-01</span></div>
              <div className="text-green-400 font-semibold">Status: Up to date</div>
            </div>
            <div className="bg-blue-900/60 rounded-xl p-6">
              <div className="text-blue-100 text-lg font-semibold mb-2">Firmware Upgrade</div>
              <button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-md shadow flex items-center gap-2 transition"
                onClick={() => alert('Firmware upgrade started!')}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M12 5v6h4M20 12a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>
                Start Firmware Upgrade
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Logs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-blue-100 text-lg font-semibold">System Logs</div>
              <div className="flex gap-2">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition"
                  onClick={handleDownload}
                >
                  <Download size={18} className="inline" />
                  Download
                </button>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition"
                  onClick={handleClear}
                >
                  <Trash2 size={18} className="inline" />
                  Clear
                </button>
              </div>
            </div>
            <div className="bg-blue-900/80 rounded-xl p-4">
              {logs.length === 0 ? (
                <div className="text-blue-300 text-center py-8">No logs available.</div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="font-mono text-sm mb-2 px-2 py-1 rounded"
                    style={{
                      background: '#0f172a',
                      color: log.type === 'WARN' ? '#facc15' : log.type === 'INFO' ? '#22d3ee' : '#fff',
                      borderLeft: log.type === 'WARN' ? '4px solid #facc15' : log.type === 'INFO' ? '4px solid #22d3ee' : 'none'
                    }}
                  >
                    <span className="text-blue-300">{log.time}</span>{' '}
                    <span className={log.type === 'WARN' ? 'text-yellow-400' : log.type === 'INFO' ? 'text-cyan-400' : 'text-white'}>
                      {log.type}
                    </span>: {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManagement;