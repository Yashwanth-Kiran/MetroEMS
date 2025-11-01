import React, { useState, useEffect, useRef } from 'react';
import DeviceSummary from './DeviceSummary';
import { ArrowLeft, Settings, Activity, UploadCloud, FileText, Trash2, Download, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiService } from '../services/apiService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

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
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);
  const [followTail, setFollowTail] = useState(true); // when true, keep auto-scrolling to bottom
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceSession, setDeviceSession] = useState(null);
  const [realDeviceData, setRealDeviceData] = useState(null);
  const [summaryExtras, setSummaryExtras] = useState({});
  const [chartData, setChartData] = useState([]); // rolling 60s window
  const MAX_POINTS = 60;
  
  const navigate = useNavigate();
  const { type } = useParams();
  const location = useLocation();
  
  // Extract session ID from route state or URL
  const sessionId = location.state?.sessionId || new URLSearchParams(location.search).get('session');

  // Check backend connectivity and load device session
  useEffect(() => {
    // Pre-fill with clicked device info if present
    if (location.state?.deviceInfo?.ip) {
      setConfig(prev => ({
        ...prev,
        ipAddress: location.state.deviceInfo.ip,
        systemName: location.state.deviceInfo.name || prev.systemName,
      }));
    }

    const checkBackendAndLoadDevice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check backend connectivity
        const connected = await apiService.checkBackendConnection();
        setIsBackendConnected(connected);
        
        // If we have a session ID, load the device session
        if (connected && sessionId) {
          try {
            const session = await apiService.getDeviceSession(sessionId);
            setDeviceSession(session);
            
            // Update config with real device data
            if (session.device_info) {
              setConfig(prevConfig => ({
                ...prevConfig,
                systemName: session.device_info.name || prevConfig.systemName,
                ipAddress: session.device_info.ip_address || prevConfig.ipAddress,
                // Add other real device properties as available
              }));
            }
            
            // Load real device configuration
            const deviceConfig = await apiService.getDeviceConfiguration(sessionId);
            if (deviceConfig) {
              setRealDeviceData(deviceConfig);
              // Backend returns { systemName, ipAddress, ... } OR { config: {...} }
              const cfg = deviceConfig.config ? deviceConfig.config : deviceConfig;
              setConfig(prevConfig => ({
                ...prevConfig,
                ...cfg
              }));
            }
          } catch (sessionError) {
            console.warn('Failed to load device session:', sessionError);
            setError('Failed to load device session. Using demo mode.');
          }
        }
      } catch (err) {
        console.error('Backend connection failed:', err);
        setIsBackendConnected(false);
        setError('Backend connection failed. Running in demo mode.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkBackendAndLoadDevice();
  }, [sessionId]);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isBackendConnected && sessionId) {
        // Save configuration to real device via backend
        await apiService.updateDeviceConfiguration(sessionId, config);
        alert('Configuration saved to device successfully!');
      } else {
        // Demo mode
        alert('Configuration saved!\n' + JSON.stringify(config, null, 2));
      }
    } catch (err) {
      console.error('Failed to save configuration:', err);
      setError('Failed to save configuration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
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
    
    const updateMonitoring = async () => {
      if (isBackendConnected && sessionId) {
        try {
          // Get real monitoring data from backend
          const monitoringData = await apiService.getDeviceMonitoring(sessionId);
          if (monitoringData) {
            const next = {
              signal: Number(
                monitoringData.signal_strength ?? monitoring.signal
              ),
              snr: Number(monitoringData.snr ?? monitoring.snr),
              tx: Number(monitoringData.tx_rate ?? monitoring.tx),
              rx: Number(monitoringData.rx_rate ?? monitoring.rx),
            };
            setMonitoring(next);
            setChartData(prev => {
              const t = new Date();
              const point = {
                t: t.toLocaleTimeString(),
                signal: next.signal,
                snr: next.snr,
                tx: next.tx,
                rx: next.rx,
              };
              const arr = [...prev, point];
              return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
            });
          }
        } catch (err) {
          console.warn('Failed to fetch real monitoring data, using simulation:', err);
          // Fall back to simulation
          const sim = {
            signal: Number((70 + Math.random() * 10).toFixed(2)),
            snr: Number((40 + Math.random() * 10).toFixed(1)),
            tx: Math.floor(120 + Math.random() * 40),
            rx: Math.floor(100 + Math.random() * 30),
          };
          setMonitoring(sim);
          setChartData(prev => {
            const t = new Date();
            const point = { t: t.toLocaleTimeString(), ...sim };
            const arr = [...prev, point];
            return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
          });
        }
      } else {
        // Demo mode - keep lightweight placeholder values
        const sim = {
          signal: Number((70 + Math.random() * 10).toFixed(2)),
          snr: Number((40 + Math.random() * 10).toFixed(1)),
          tx: Math.floor(120 + Math.random() * 40),
          rx: Math.floor(100 + Math.random() * 30),
        };
        setMonitoring(sim);
        setChartData(prev => {
          const t = new Date();
          const point = { t: t.toLocaleTimeString(), ...sim };
          const arr = [...prev, point];
          return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
        });
      }
    };
    
    // Initial update
    updateMonitoring();
    
    // Set up interval for real-time updates
    const interval = setInterval(updateMonitoring, 1000); // 1 second updates
    return () => clearInterval(interval);
  }, [activeTab, isBackendConnected, sessionId]);

  // Live logs polling for Monitoring and Logs tabs
  useEffect(() => {
    if (!(activeTab === 'Monitoring' || activeTab === 'Logs')) return;
    let cancelled = false;

    const fetchLogs = async () => {
      if (isBackendConnected && sessionId) {
        try {
          const newLogs = await apiService.getDeviceLogsEnhanced(sessionId);
          if (!cancelled && Array.isArray(newLogs)) {
            // Normalize possible shapes
            const normalized = newLogs.map(l => ({
              time: l.time || l.timestamp || new Date().toISOString(),
              type: l.type || l.level || 'INFO',
              message: l.message || l.msg || ''
            }));
            // Merge by time+message (simple de-dup)
            setLogs(prev => {
              const seen = new Set(prev.map(p => `${p.time}|${p.message}`));
              const merged = [...prev];
              for (const n of normalized) {
                const key = `${n.time}|${n.message}`;
                if (!seen.has(key)) merged.push(n);
              }
              // Keep last 500 logs
              return merged.length > 500 ? merged.slice(merged.length - 500) : merged;
            });
          }
        } catch (e) {
          // ignore transient errors
        }
      } else {
        // In demo, append a synthetic log periodically
        const now = new Date();
        setLogs(prev => {
          const demo = {
            time: `[${now.toLocaleString()}]` ,
            type: Math.random() < 0.1 ? 'WARN' : 'INFO',
            message: Math.random() < 0.5 ? 'Periodic health check OK' : 'Monitoring tick update'
          };
          const arr = [...prev, demo];
          return arr.length > 200 ? arr.slice(arr.length - 200) : arr;
        });
      }
    };

    // Initial call and interval setup
    fetchLogs();
    const id = setInterval(fetchLogs, 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeTab, isBackendConnected, sessionId]);

  // Auto-scroll the visible logs container only when following the tail
  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el || !followTail) return;
    // Scroll the container to bottom without affecting the page scroll
    el.scrollTop = el.scrollHeight;
  }, [logs, followTail]);

  // Detect user scroll position to toggle followTail off when scrolling up
  const handleLogsScroll = () => {
    const el = logsContainerRef.current;
    if (!el) return;
    const threshold = 16; // px tolerance from bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > threshold) {
      // User is not at the bottom; pause following
      if (followTail) setFollowTail(false);
    } else {
      // Near bottom; resume following
      if (!followTail) setFollowTail(true);
    }
  };

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
            {deviceSession && (
              <span className="text-lg text-blue-200 ml-2">
                - {deviceSession.device_info?.name || deviceSession.device_info?.ip_address}
              </span>
            )}
          </h2>
          
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            {isBackendConnected ? (
              <>
                <CheckCircle size={20} className="text-green-400" />
                <span className="text-green-400 text-sm">
                  {sessionId ? 'Real Device' : 'Backend Connected'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="text-yellow-400" />
                <span className="text-yellow-400 text-sm">Demo Mode</span>
              </>
            )}
          </div>
        </div>
        
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-md flex items-center gap-2">
            <AlertCircle size={16} className="text-yellow-400" />
            <span className="text-yellow-100 text-sm">{error}</span>
          </div>
        )}
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="mb-6 flex items-center justify-center py-8">
            <div className="text-center">
              <Loader size={32} className="animate-spin text-blue-400 mx-auto mb-2" />
              <p className="text-blue-200 text-sm">Loading device data...</p>
            </div>
          </div>
        )}
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
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold px-6 py-2 rounded-md shadow hover:from-cyan-500 hover:to-blue-600 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Configuration
                    {isBackendConnected && sessionId && (
                      <span className="text-xs">(to device)</span>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'Monitoring' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start relative">
                <div className="text-blue-100 text-sm mb-2">Signal Strength</div>
                <div className="text-2xl font-bold text-white">{monitoring.signal}%</div>
                {isBackendConnected && sessionId && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Data" />
                )}
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start relative">
                <div className="text-blue-100 text-sm mb-2">SNR</div>
                <div className="text-2xl font-bold text-white">{monitoring.snr} dB</div>
                {isBackendConnected && sessionId && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Data" />
                )}
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start relative">
                <div className="text-blue-100 text-sm mb-2">TX Rate</div>
                <div className="text-2xl font-bold text-white">{monitoring.tx} Mbps</div>
                {isBackendConnected && sessionId && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Data" />
                )}
              </div>
              <div className="bg-blue-900/60 rounded-xl p-6 flex flex-col items-start relative">
                <div className="text-blue-100 text-sm mb-2">RX Rate</div>
                <div className="text-2xl font-bold text-white">{monitoring.rx} Mbps</div>
                {isBackendConnected && sessionId && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Data" />
                )}
              </div>
            </div>
            <div className="bg-blue-900/60 rounded-xl p-6 mt-4">
              <div className="text-blue-100 mb-3 font-semibold flex items-center gap-2">
                Network Performance
                {isBackendConnected && sessionId ? (
                  <span className="text-xs text-green-400">(Live from device · 1s)</span>
                ) : (
                  <span className="text-xs text-yellow-400">(Simulated · 1s)</span>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-56 bg-blue-900/50 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                      <XAxis dataKey="t" tick={{ fill: '#93c5fd', fontSize: 12 }} hide />
                      <YAxis tick={{ fill: '#93c5fd', fontSize: 12 }} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e3a8a', color: '#e2e8f0' }} />
                      <Legend wrapperStyle={{ color: '#93c5fd' }} />
                      <Line type="monotone" dataKey="snr" stroke="#22d3ee" strokeWidth={2} dot={false} name="SNR (dB)" />
                      <Line type="monotone" dataKey="signal" stroke="#34d399" strokeWidth={2} dot={false} name="Signal (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-56 bg-blue-900/50 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                      <XAxis dataKey="t" tick={{ fill: '#93c5fd', fontSize: 12 }} hide />
                      <YAxis tick={{ fill: '#93c5fd', fontSize: 12 }} domain={[0, 'auto']} />
                      <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e3a8a', color: '#e2e8f0' }} />
                      <Legend wrapperStyle={{ color: '#93c5fd' }} />
                      <Line type="monotone" dataKey="tx" stroke="#f59e0b" strokeWidth={2} dot={false} name="TX (Mbps)" />
                      <Line type="monotone" dataKey="rx" stroke="#60a5fa" strokeWidth={2} dot={false} name="RX (Mbps)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Live Log Tail inside Monitoring */}
            <div className="bg-blue-900/60 rounded-xl p-4 mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-100 text-sm font-semibold">Live Logs</div>
                <div className="flex items-center gap-3 text-xs text-blue-200">
                  <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                    <input type="checkbox" className="accent-cyan-400" checked={followTail} onChange={(e) => setFollowTail(e.target.checked)} />
                    Follow live
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const el = logsContainerRef.current;
                      if (el) { el.scrollTop = el.scrollHeight; }
                      setFollowTail(true);
                    }}
                    className="px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
                    title="Jump to bottom"
                  >
                    Jump to bottom
                  </button>
                </div>
              </div>
              <div
                ref={logsContainerRef}
                onScroll={handleLogsScroll}
                className="max-h-48 overflow-auto rounded-md"
                style={{ background: '#0f172a' }}
              >
                {logs.length === 0 ? (
                  <div className="text-blue-300 text-center py-4">Waiting for logs…</div>
                ) : (
                  logs.slice(-100).map((log, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-xs mb-1 px-2 py-1"
                      style={{
                        color: log.type === 'WARN' ? '#facc15' : log.type === 'INFO' ? '#22d3ee' : '#e5e7eb',
                        borderLeft: log.type === 'WARN' ? '3px solid #facc15' : log.type === 'INFO' ? '3px solid #22d3ee' : 'none'
                      }}
                    >
                      <span className="text-blue-300">{log.time}</span> {log.type}: {log.message}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
            {/* Static Device Summary below live metrics */}
            <div className="flex justify-end mb-2">
              {isBackendConnected && sessionId && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const refreshed = await apiService.refreshSession(sessionId);
                      setSummaryExtras({
                        sysDescr: refreshed.sysDescr,
                        sysUpTime: refreshed.sysUpTime,
                        system_name: refreshed.system_name
                      });
                      if (refreshed.system_name) {
                        setConfig(prev => ({ ...prev, systemName: refreshed.system_name }));
                      }
                    } catch (e) {
                      console.warn('Refresh failed', e);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Refresh Summary
                </button>
              )}
            </div>
            <DeviceSummary device={{
              name: summaryExtras.system_name || deviceSession?.device_info?.system_name || deviceSession?.device_info?.name || location.state?.deviceInfo?.name,
              ipAddress: deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip,
              ip: deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip,
              device_type: 'station_radio',
              connection_verified: !!(isBackendConnected && sessionId),
              last_verified: new Date().toISOString(),
              sysDescr: summaryExtras.sysDescr || realDeviceData?.config?.sysDescr,
              sysUpTime: summaryExtras.sysUpTime || realDeviceData?.config?.sysUpTime,
              radio_mode: deviceSession?.device_info?.radio_mode,
              bandwidth: deviceSession?.device_info?.bandwidth,
              channel: deviceSession?.device_info?.channel,
              ssid: deviceSession?.device_info?.ssid
            }} />
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
                <div>
                  {/* Optional: a contained scroll area for long logs page to avoid page jump */}
                  <div className="max-h-[70vh] overflow-auto rounded-md" ref={activeTab === 'Logs' ? logsContainerRef : null} onScroll={activeTab === 'Logs' ? handleLogsScroll : undefined} style={{ background: '#0f172a' }}>
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="font-mono text-sm mb-2 px-2 py-1 rounded"
                        style={{
                          background: 'transparent',
                          color: log.type === 'WARN' ? '#facc15' : log.type === 'INFO' ? '#22d3ee' : '#fff',
                          borderLeft: log.type === 'WARN' ? '4px solid #facc15' : log.type === 'INFO' ? '4px solid #22d3ee' : 'none'
                        }}
                      >
                        <span className="text-blue-300">{log.time}</span>{' '}
                        <span className={log.type === 'WARN' ? 'text-yellow-400' : log.type === 'INFO' ? 'text-cyan-400' : 'text-white'}>
                          {log.type}
                        </span>: {log.message}
                      </div>
                    ))}
                    <div ref={activeTab === 'Logs' ? logsEndRef : null} />
                  </div>
                  <div className="flex items-center justify-end gap-3 mt-2 text-xs text-blue-200">
                    <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                      <input type="checkbox" className="accent-cyan-400" checked={followTail} onChange={(e) => setFollowTail(e.target.checked)} />
                      Follow live
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const el = logsContainerRef.current;
                        if (el) { el.scrollTop = el.scrollHeight; }
                        setFollowTail(true);
                      }}
                      className="px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
                      title="Jump to bottom"
                    >
                      Jump to bottom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManagement;