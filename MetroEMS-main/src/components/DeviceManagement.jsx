import React, { useState, useEffect, useRef } from 'react';
import DeviceSummary from './DeviceSummary';
import { ArrowLeft, Settings, Activity, UploadCloud, FileText, Trash2, Download, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiService } from '../services/apiService';
import proximHttp from '../api/proximHttp';
import { deviceSchemas } from '../schema/deviceSchemas';
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
  { name: 'Summary', icon: <Activity size={18} /> },
  { name: 'Monitoring', icon: <Activity size={18} /> },
  { name: 'Configuration', icon: <Settings size={18} /> },
  { name: 'Logs', icon: <FileText size={18} /> },
  { name: 'Wireless', icon: <Activity size={18} /> },
  { name: 'Firmware', icon: <UploadCloud size={18} /> },
];

const initialConfig = {
  systemName: null,
  ipAddress: null,
  ssid: null,
  bandwidth: null,
  channel: null,
  radioMode: null,
};

const bandwidthOptions = ['20MHz', '40MHz', '80MHz'];
const channelOptions = ['Auto', '1', '6', '11'];
const radioModeOptions = ['Access Point', 'Client', 'Repeater'];

const initialLogs = [];

const DeviceManagement = () => {
  const [activeTab, setActiveTab] = useState('Summary');
  const [unifiedSummary, setUnifiedSummary] = useState(null);
  const [config, setConfig] = useState(initialConfig);
  const [monitoring, setMonitoring] = useState({
    signal: 77.04,
    snr: 43.4,
    tx: 139,
    rx: 113,
  });
  const [logs, setLogs] = useState(initialLogs);
  const [httpLogLines, setHttpLogLines] = useState([]);
  const [httpLogFilter, setHttpLogFilter] = useState('');
  const [httpLogLoading, setHttpLogLoading] = useState(false);
  const [httpLogError, setHttpLogError] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [ethernetInfo, setEthernetInfo] = useState(null);
  const [snrRows, setSnrRows] = useState([]);
  const [snrError, setSnrError] = useState(null);
  const [snrLoading, setSnrLoading] = useState(false);
  const [sseActive, setSseActive] = useState(false);
  const sseRef = useRef(null);
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
            // Load unified summary for Summary tab
            try {
              const uni = await apiService.getUnifiedDeviceSummary(sessionId, type || 'station_radio');
              setUnifiedSummary(uni);
            } catch {}
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

  // Download Event Log via HTTP (raw)
  const handleHttpLogDownload = async () => {
    const ip = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!ip) return;
    try {
      setHttpLogError(null);
      await proximHttp.login(ip).catch(() => {});
      const blob = await proximHttp.downloadLogs(ip, { raw: true });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eventlog_${ip}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setHttpLogError('Download failed. Check credentials (admin/public) or device reachability.');
    }
  };

  // Load parsed HTTP Event Log lines
  const loadHttpLogLines = async () => {
    const ip = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!ip) return;
    setHttpLogLoading(true);
    setHttpLogError(null);
    try {
      await proximHttp.login(ip).catch(() => {});
      const lines = await proximHttp.downloadLogs(ip, { raw: false });
      const norm = (Array.isArray(lines) ? lines : []).map(l => ({ ts: l.ts || null, text: l.text || '' }));
      setHttpLogLines(norm);
    } catch (e) {
      setHttpLogError('View failed. Check credentials (admin/public) or device reachability.');
    } finally {
      setHttpLogLoading(false);
    }
  };

  // Auto-refresh parsed HTTP event log when Logs tab active
  useEffect(() => {
    if (activeTab !== 'Logs') return;
    loadHttpLogLines();
    const id = setInterval(loadHttpLogLines, 30000);
    return () => clearInterval(id);
  }, [activeTab, deviceSession]);

  const filteredHttpLines = httpLogFilter
    ? httpLogLines.filter(l => (l.text || '').toLowerCase().includes(httpLogFilter.toLowerCase()) || (l.ts || '').toLowerCase().includes(httpLogFilter.toLowerCase()))
    : httpLogLines;

  // Basic virtualization for parsed HTTP log view
  const VIRTUAL_WINDOW = 400;
  const ROW_HEIGHT = 20;
  const [logScrollTop, setLogScrollTop] = useState(0);
  const onHttpLogScroll = (e) => { setLogScrollTop(e.currentTarget.scrollTop); };
  const visibleCount = Math.ceil(VIRTUAL_WINDOW / ROW_HEIGHT) + 4;
  const startIndex = Math.max(0, Math.floor(logScrollTop / ROW_HEIGHT) - 2);
  const httpSlice = filteredHttpLines.slice(startIndex, startIndex + visibleCount);

  // Fetch license and ethernet when Configuration tab is active
  useEffect(() => {
    if (activeTab !== 'Configuration') return;
    const ip = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!ip) return;
    let cancelled = false;
    const fetchInfo = async () => {
      try {
        const [lic, eth] = await Promise.all([
          proximHttp.getLicense(ip).catch(() => null),
          proximHttp.getEthernet(ip).catch(() => null),
        ]);
        if (!cancelled) {
          setLicenseInfo(lic);
          setEthernetInfo(eth);
        }
      } catch {}
    };
    fetchInfo();
    const id = setInterval(fetchInfo, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeTab, deviceSession]);

  // Fetch SNR table when Wireless tab is active
  useEffect(() => {
    if (activeTab !== 'Wireless') return;
    const ip = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!ip) return;
    setSnrLoading(true);
    setSnrError(null);
    proximHttp.login(ip).catch(() => {})
      .then(() => proximHttp.getSnrTable(ip))
      .then(rows => { setSnrRows(Array.isArray(rows) ? rows : []); })
      .catch(() => setSnrError('Failed to load SNR table. Verify device UI and firmware.'))
      .finally(() => setSnrLoading(false));
  }, [activeTab, deviceSession]);

  // Real metrics only: fetch timeseries from backend every 5s; no simulation
  useEffect(() => {
    if (activeTab !== 'Monitoring') return;
    let cancelled = false;
    const deviceIp = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!(isBackendConnected && sessionId && deviceIp)) return;

    const fetchLiveMetrics = async () => {
      try {
        const [snrSeries, txSeries, rxSeries, qualSeries] = await Promise.all([
          apiService.getMetricSeries({ deviceIp, metric: 'snr', mins: 1 }),
          apiService.getMetricSeries({ deviceIp, metric: 'txMbps', mins: 1 }),
          apiService.getMetricSeries({ deviceIp, metric: 'rxMbps', mins: 1 }),
          apiService.getMetricSeries({ deviceIp, metric: 'linkQuality', mins: 1 }),
        ]);
        if (cancelled) return;
        const last = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1]?.value : null);
        const next = {
          signal: Number(last(qualSeries) ?? monitoring.signal ?? 0),
          snr: Number(last(snrSeries) ?? monitoring.snr ?? 0),
          tx: Number(last(txSeries) ?? monitoring.tx ?? 0),
          rx: Number(last(rxSeries) ?? monitoring.rx ?? 0),
        };
        setMonitoring(next);
        // Shape chart points using the latest values; avoid creating movement without new data
        const t = new Date().toLocaleTimeString();
        setChartData((prev) => {
          const point = { t, signal: next.signal, snr: next.snr, tx: next.tx, rx: next.rx };
          const arr = [...prev, point];
          return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
        });
      } catch (e) {
        // keep last values; do not simulate
      }
    };

    fetchLiveMetrics();
    const id = setInterval(fetchLiveMetrics, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeTab, isBackendConnected, sessionId, deviceSession]);

  // When backend is connected and device IP is known, sample timeseries endpoints periodically to update live metrics
  useEffect(() => {
    if (activeTab !== 'Monitoring') return;
    if (!isBackendConnected || !sessionId) return;
    const deviceIp = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
    if (!deviceIp) return;

    let cancelled = false;
    const fetchSeries = async () => {
      try {
        const [snrSeries, txSeries, rxSeries] = await Promise.all([
          apiService.getMetricSeries({ deviceIp, metric: 'snr', mins: 1 }),
          apiService.getMetricSeries({ deviceIp, metric: 'txMbps', mins: 1 }),
          apiService.getMetricSeries({ deviceIp, metric: 'rxMbps', mins: 1 }),
        ]);
        if (cancelled) return;
        const latest = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1].value : null);
        const next = {
          signal: monitoring.signal, // keep existing placeholder unless available elsewhere
          snr: Number(latest(snrSeries) ?? monitoring.snr),
          tx: Number(latest(txSeries) ?? monitoring.tx),
          rx: Number(latest(rxSeries) ?? monitoring.rx),
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
      } catch (e) {
        // ignore
      }
    };
    fetchSeries();
    const id = setInterval(fetchSeries, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeTab, isBackendConnected, sessionId, deviceSession, location.state]);

  // Live logs via SSE when Logs tab active and backend connected
  useEffect(() => {
    // require Logs tab, backend, session and device IP
    const deviceIp = deviceSession?.device_info?.ip_address;
    if (!(activeTab === 'Logs' && isBackendConnected && sessionId && deviceIp)) {
      return;
    }
    // Close any existing stream
    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }
    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const es = apiService.createLogsEventSource({ deviceIp, since });
    sseRef.current = es;
    setSseActive(true);
    es.onmessage = (evt) => {
      try {
        const entry = JSON.parse(evt.data);
        const norm = {
          time: entry.time || entry.received_at || new Date().toISOString(),
          type: entry.type || entry.level || 'INFO',
          message: entry.message || entry.msg || ''
        };
        setLogs(prev => {
          const key = `${norm.time}|${norm.message}`;
          const seen = new Set(prev.map(p => `${p.time}|${p.message}`));
          if (seen.has(key)) return prev;
          const merged = [...prev, norm];
          return merged.length > 500 ? merged.slice(merged.length - 500) : merged;
        });
      } catch {}
    };
    es.onerror = () => {
      setSseActive(false);
      try { es.close(); } catch {}
      sseRef.current = null;
    };
    return () => {
      try { es.close(); } catch {}
      sseRef.current = null;
      setSseActive(false);
    };
  }, [activeTab, isBackendConnected, sessionId, deviceSession]);

  // Fallback polling when not using SSE (Monitoring or Logs tabs)
  // Poll logs only when backend connected; never simulate
  useEffect(() => {
    if (activeTab !== 'Logs') return;
    if (sseActive) return; // SSE active
    if (!(isBackendConnected && sessionId)) return;
    let cancelled = false;
    const deviceIp = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;

    const fetchLogs = async () => {
      try {
        let newLogs = [];
        if (deviceIp) newLogs = await apiService.getRecentLogs({ deviceIp, limit: 200 });
        else newLogs = await apiService.getDeviceLogsEnhanced(sessionId);
        if (!cancelled && Array.isArray(newLogs)) {
          const normalized = newLogs.map(l => ({
            time: l.time || l.timestamp || l.ts || new Date().toISOString(),
            type: l.type || l.level || l.sev || 'INFO',
            message: l.message || l.msg || ''
          }));
          setLogs(prev => {
            const seen = new Set(prev.map(p => `${p.time}|${p.message}`));
            const merged = [...prev];
            for (const n of normalized) {
              const key = `${n.time}|${n.message}`;
              if (!seen.has(key)) merged.push(n);
            }
            return merged.length > 500 ? merged.slice(merged.length - 500) : merged;
          });
        }
      } catch {}
    };
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeTab, isBackendConnected, sessionId, sseActive, deviceSession]);

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
        {activeTab === 'Summary' && (
          <SummaryView deviceType={type || 'station_radio'} summary={unifiedSummary} />
        )}
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

        {activeTab === 'Configuration' && (
          <div className="mt-6 space-y-8">
            {licenseInfo && (
              <div className="bg-blue-900/60 rounded-xl p-4 border border-blue-800/50">
                <div className="text-white font-semibold mb-3">License Features</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <InfoCard label="Product" value={licenseInfo.product_description} />
                  <InfoCard label="MAC" value={licenseInfo.mac} />
                  <InfoCard label="Max Output Mbps" value={licenseInfo.max_output_mbps} />
                  <InfoCard label="Max Input Mbps" value={licenseInfo.max_input_mbps} />
                  <InfoCard label="Max Aggregate Mbps" value={licenseInfo.max_aggregate_mbps} />
                  <InfoCard label="Family" value={licenseInfo.product_family} />
                  <InfoCard label="Class" value={licenseInfo.product_class} />
                </div>
              </div>
            )}
            {ethernetInfo && (
              <div className="bg-blue-900/60 rounded-xl p-4 border border-blue-800/50">
                <div className="text-white font-semibold mb-3">Ethernet Interface</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <InfoCard label="MAC" value={ethernetInfo.mac} />
                  <InfoCard label="Speed (Mbit)" value={ethernetInfo.operational_speed_mbit} />
                  <InfoCard label="Duplex" value={ethernetInfo.duplex} />
                  <InfoCard label="Admin Status" value={ethernetInfo.admin_status} />
                </div>
              </div>
            )}
          </div>
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
              <div className="text-white mb-1">Version: <span className="font-bold">{realDeviceData?.firmwareVersion || 'Unknown'}</span></div>
              <div className="text-white mb-1">Build Date: <span className="font-bold">{realDeviceData?.buildDate || '—'}</span></div>
              <div className="text-blue-200 text-sm">Session: {sessionId ? 'Connected' : 'Not connected'}</div>
            </div>
            <div className="bg-blue-900/60 rounded-xl p-6">
              <div className="text-blue-100 text-lg font-semibold mb-3">Firmware Upgrade</div>
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="file"
                  accept=".bin,.img,.trx,.tar,.zip"
                  className="text-blue-100"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    setSummaryExtras(prev => ({ ...prev, fwFile: file || null }));
                  }}
                  disabled={!isBackendConnected || !sessionId}
                />
                <button
                  type="button"
                  disabled={!isBackendConnected || !sessionId || !summaryExtras.fwFile}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-md shadow flex items-center gap-2 transition"
                  onClick={async () => {
                    if (!summaryExtras.fwFile) return;
                    try {
                      await apiService.uploadFirmware(sessionId, summaryExtras.fwFile);
                      alert('Firmware upload initiated. The device may reboot.');
                    } catch (err) {
                      const msg = (err && err.message) ? err.message : String(err);
                      if (/404|Not Found/i.test(msg)) {
                        alert('Firmware upgrade not supported by this backend build.');
                      } else {
                        alert('Firmware upgrade failed: ' + msg);
                      }
                    }
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className="inline"><path d="M12 5v6h4M20 12a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>
                  Start Firmware Upgrade
                </button>
              </div>
              {!isBackendConnected && (
                <div className="text-yellow-300 text-sm">Backend not connected. Firmware upgrade is unavailable.</div>
              )}
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
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition"
                  onClick={handleHttpLogDownload}
                >
                  <Download size={18} className="inline" />
                  Download Event Log (HTTP)
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
            {httpLogError && (
              <div className="mb-3 p-2 bg-red-500/20 border border-red-500 text-red-100 text-sm rounded">{httpLogError}</div>
            )}
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
            {/* Parsed HTTP Event Log */}
            <div className="mt-6 bg-blue-900/60 rounded-xl p-4 border border-blue-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-white font-semibold">HTTP Event Log (Parsed)</div>
                <button
                  onClick={loadHttpLogLines}
                  disabled={httpLogLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-md flex items-center gap-2"
                >
                  {httpLogLoading ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
                  Refresh View
                </button>
                <input
                  type="text"
                  placeholder="Filter..."
                  value={httpLogFilter}
                  onChange={(e) => setHttpLogFilter(e.target.value)}
                  className="ml-auto px-2 py-1 rounded bg-blue-950/60 text-blue-100 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  style={{ minWidth: '180px' }}
                />
              </div>
              <div
                style={{ height: VIRTUAL_WINDOW }}
                onScroll={onHttpLogScroll}
                className="overflow-y-auto bg-blue-950/40 rounded-md border border-blue-800/50 relative"
              >
                <div style={{ height: filteredHttpLines.length * ROW_HEIGHT, position: 'relative' }}>
                  {httpSlice.map((line, i) => {
                    const globalIndex = startIndex + i;
                    return (
                      <div
                        key={globalIndex}
                        style={{ position: 'absolute', top: (globalIndex * ROW_HEIGHT), left: 0, right: 0, height: ROW_HEIGHT }}
                        className="px-3 py-[2px] font-mono text-xs whitespace-nowrap"
                      >
                        <span className="text-blue-400">[{line.ts || '---'}]</span>{' '}
                        <span className="text-blue-100">{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Wireless' && (
          <div className="mt-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="text-white font-semibold">Local SNR Table</div>
              {snrLoading && <Loader size={16} className="animate-spin text-cyan-300" />}
              {snrError && <span className="text-red-300 text-sm">{snrError}</span>}
              <button
                onClick={() => {
                  const ip = deviceSession?.device_info?.ip_address || location.state?.deviceInfo?.ip;
                  if (!ip) return;
                  setSnrLoading(true); setSnrError(null);
                  proximHttp.getSnrTable(ip)
                    .then(rows => setSnrRows(Array.isArray(rows) ? rows : []))
                    .catch(() => setSnrError('Reload failed.'))
                    .finally(() => setSnrLoading(false));
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs flex items-center gap-1"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="overflow-auto max-h-80 border border-blue-800/50 rounded-md bg-blue-950/40">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-blue-900/70">
                  <tr className="text-blue-200">
                    <th className="px-2 py-1 text-left">Idx</th>
                    <th className="px-2 py-1 text-left">MCS</th>
                    <th className="px-2 py-1 text-left">Modulation</th>
                    <th className="px-2 py-1 text-left">Streams</th>
                    <th className="px-2 py-1 text-left">Rate Mbps</th>
                    <th className="px-2 py-1 text-left">Min SNR</th>
                    <th className="px-2 py-1 text-left">Max SNR</th>
                  </tr>
                </thead>
                <tbody>
                  {snrRows.map(r => (
                    <tr key={r.index} className="odd:bg-blue-900/30 text-blue-100">
                      <td className="px-2 py-1">{r.index}</td>
                      <td className="px-2 py-1">{r.mcs_index}</td>
                      <td className="px-2 py-1">{r.modulation}</td>
                      <td className="px-2 py-1">{r.streams}</td>
                      <td className="px-2 py-1">{r.data_rate_mbps}</td>
                      <td className="px-2 py-1">{r.min_required_snr_db}</td>
                      <td className="px-2 py-1">{r.max_optimum_snr_db}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-blue-900/60 rounded-xl p-4">
              <div className="text-white font-semibold mb-2">Data Rate vs MCS Index</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={snrRows.map(r => ({ mcs: r.mcs_index, rate: r.data_rate_mbps }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
                  <XAxis dataKey="mcs" stroke="#93c5fd" />
                  <YAxis stroke="#93c5fd" />
                  <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e3a8a', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ color: '#93c5fd' }} />
                  <Line type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManagement;

function InfoCard({ label, value }) {
  return (
    <div className="bg-blue-900/40 rounded-md p-3 border border-blue-800/50">
      <div className="text-xs uppercase tracking-wide text-blue-300">{label}</div>
      <div className="text-sm text-white font-semibold break-all">{value ?? '—'}</div>
    </div>
  );
}

function SummaryView({ deviceType, summary }) {
  const schema = deviceSchemas[deviceType] || deviceSchemas.station_radio;
  const s = summary || {};
  const left = schema.summaryLeft || [];
  const right = schema.summaryRight || [];
  const Pill = ({ online }) => (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${online ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'}`}>
      {online ? 'Online' : 'Unknown'}
    </span>
  );
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold text-white">
          {deviceType?.replace(/_/g,' ') || 'Device'} - {s.sysName || s.ip || '—'}
        </div>
        <Pill online={!!s.online} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-900/60 rounded-xl p-4 border border-blue-800/50">
          <div className="text-white font-semibold mb-3">Identity & Status</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {left.map(f => (
              <InfoCard key={f.key} label={f.label} value={s[f.key] ?? null} />
            ))}
          </div>
        </div>
        <div className="bg-blue-900/60 rounded-xl p-4 border border-blue-800/50">
          <div className="text-white font-semibold mb-3">Radio Link Overview</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {right.map(f => (
              <InfoCard key={f.key} label={f.label} value={s[f.key] ?? null} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}