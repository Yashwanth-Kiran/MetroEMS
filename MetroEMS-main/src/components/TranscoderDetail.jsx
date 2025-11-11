import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Settings, Activity, UploadCloud, FileText, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  { name: 'Summary', icon: <Activity size={18} /> },
  { name: 'Monitoring', icon: <Activity size={18} /> },
  { name: 'Configuration', icon: <Settings size={18} /> },
  { name: 'Firmware', icon: <UploadCloud size={18} /> },
  { name: 'Logs', icon: <FileText size={18} /> },
];

const TranscoderDetail = () => {
  const [activeTab, setActiveTab] = useState('Summary');
  const [summary, setSummary] = useState(null);
  const [config, setConfig] = useState({
    bitrate: null,
    profile: null,
    iptos: null,
    type: null,
    cam1URL: null,
    cam2URL: null,
    cam3URL: null,
    cam4URL: null,
  });
  const [monitoring, setMonitoring] = useState({
    cpu: 0,
    memory: 0,
    inputSignal: 'N/A',
    outputStream: 'N/A',
    temperature: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deviceSession, setDeviceSession] = useState(null);
  const [followTail, setFollowTail] = useState(true);
  const logsContainerRef = useRef(null);
  const logsEndRef = useRef(null);
  const sseRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const sessionId = location.state?.sessionId || new URLSearchParams(location.search).get('session');
  const MAX_POINTS = 60;

  // Initialize and load device data
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Check backend connectivity
        const connected = await apiService.checkBackendConnection();
        setIsBackendConnected(connected);
        
        if (connected && sessionId) {
          try {
            // Load device session
            const session = await apiService.getDeviceSession(sessionId);
            setDeviceSession(session);
            
            // Load transcoder summary
            const summaryData = await apiService.getUnifiedDeviceSummary(sessionId, 'transcoder');
            setSummary(summaryData);
            
            // Load configuration
            const configData = await apiService.getDeviceConfiguration(sessionId);
            if (configData) {
              setConfig(prev => ({
                ...prev,
                ...configData,
              }));
            }
          } catch (sessionError) {
            console.warn('Failed to load device session:', sessionError);
            setError('Failed to load device session. Using demo mode.');
          }
        } else {
          // Demo mode with sample data
          setSummary({
            ip: '192.168.66.12',
            type: 'transcoder',
            vendor: 'KeyWest',
            model: 'T901',
            sysName: 'KeyWest Transcoder',
            sysDescr: 'KeyWest T901 Transcoder v2.5.2',
            firmware: '2.5.2',
            hardwareVersion: '3.2.12.1',
            uptimeSeconds: 345600,
            online: true,
          });
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        setIsBackendConnected(false);
        setError('Failed to connect to backend. Running in demo mode.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeDevice();
  }, [sessionId]);

  // Real-time metrics polling for Monitoring tab
  useEffect(() => {
    if (activeTab !== 'Monitoring') return;
    if (!isBackendConnected || !sessionId) return;

    let cancelled = false;
    const deviceIp = deviceSession?.device_info?.ip_address || summary?.ip;
    if (!deviceIp) return;

    const fetchMetrics = async () => {
      try {
        const [cpuSeries, memSeries, tempSeries] = await Promise.all([
          apiService.getMetricSeries({ deviceIp, metric: 'cpu', mins: 1 }).catch(() => []),
          apiService.getMetricSeries({ deviceIp, metric: 'memory', mins: 1 }).catch(() => []),
          apiService.getMetricSeries({ deviceIp, metric: 'temperature', mins: 1 }).catch(() => []),
        ]);

        if (cancelled) return;

        const last = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1]?.value : null);
        const next = {
          cpu: Number(last(cpuSeries) ?? 0),
          memory: Number(last(memSeries) ?? 0),
          temperature: Number(last(tempSeries) ?? 0),
          inputSignal: 'Active',
          outputStream: 'Streaming',
        };

        setMonitoring(next);

        const t = new Date().toLocaleTimeString();
        setChartData(prev => {
          const point = { t, cpu: next.cpu, memory: next.memory, temperature: next.temperature };
          const arr = [...prev, point];
          return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
        });
      } catch (e) {
        console.error('Metrics fetch failed:', e);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isBackendConnected, sessionId, deviceSession, summary]);

  // Live logs via SSE when Logs tab active
  useEffect(() => {
    const deviceIp = deviceSession?.device_info?.ip_address || summary?.ip;
    if (!(activeTab === 'Logs' && isBackendConnected && sessionId && deviceIp)) {
      return;
    }

    if (sseRef.current) {
      try { sseRef.current.close(); } catch {}
      sseRef.current = null;
    }

    const since = new Date(Date.now() - 60 * 1000).toISOString();
    const es = apiService.createLogsEventSource({ deviceIp, since });
    sseRef.current = es;

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
      try { es.close(); } catch {}
      sseRef.current = null;
    };

    return () => {
      try { es.close(); } catch {}
      sseRef.current = null;
    };
  }, [activeTab, isBackendConnected, sessionId, deviceSession, summary]);

  // Auto-scroll logs
  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el || !followTail) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, followTail]);

  const handleLogsScroll = () => {
    const el = logsContainerRef.current;
    if (!el) return;
    const threshold = 16;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > threshold) {
      if (followTail) setFollowTail(false);
    } else {
      if (!followTail) setFollowTail(true);
    }
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(log => `${log.time} ${log.type}: ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcoder_logs_${summary?.ip || 'device'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfigSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isBackendConnected && sessionId) {
        await apiService.updateDeviceConfiguration(sessionId, config);
        alert('Configuration saved successfully!');
      } else {
        alert('Configuration saved!\n' + JSON.stringify(config, null, 2));
      }
    } catch (err) {
      console.error('Failed to save configuration:', err);
      setError('Failed to save configuration: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Left Sidebar */}
      <div className="w-80 bg-white/5 backdrop-blur-md border-r border-white/10 p-6 flex flex-col">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-blue-200 hover:text-white font-semibold flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        {/* Device Image */}
        <div className="bg-white rounded-xl p-6 mb-6 flex items-center justify-center">
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 120'%3E%3Crect fill='%23e0e0e0' width='200' height='120' rx='8'/%3E%3Crect fill='%23666' x='10' y='10' width='180' height='80' rx='4'/%3E%3Ctext x='100' y='55' font-family='Arial' font-size='14' fill='%23fff' text-anchor='middle'%3ETranscoder%3C/text%3E%3Crect fill='%23999' x='20' y='95' width='30' height='15' rx='2'/%3E%3Crect fill='%23999' x='60' y='95' width='30' height='15' rx='2'/%3E%3Crect fill='%23999' x='100' y='95' width='30' height='15' rx='2'/%3E%3Crect fill='%23999' x='140' y='95' width='30' height='15' rx='2'/%3E%3C/svg%3E"
            alt="Transcoder Device"
            className="w-full h-auto"
          />
        </div>

        {/* Device Info */}
        <div className="space-y-4 text-sm">
          <InfoField label="Type" value={summary?.model || 'T901'} />
          <InfoField label="Product" value={summary?.vendor || 'KeyWest'} />
          <InfoField label="IP Address" value={summary?.ip || deviceSession?.device_info?.ip_address || '—'} />
          
          <div className="border-t border-white/10 pt-4 mt-4">
            <InfoField label="Hardware Version" value={summary?.hardwareVersion || '3.2.12.1'} />
            <InfoField label="Firmware Version" value={summary?.firmware || '—'} />
          </div>

          {/* Connection Status */}
          <div className="border-t border-white/10 pt-4 mt-4">
            <div className="flex items-center gap-2">
              {isBackendConnected ? (
                <>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 text-xs">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-yellow-400" />
                  <span className="text-yellow-400 text-xs">Demo Mode</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {summary?.vendor || 'KeyWest'} Transcoder
            </h1>
            <div className="text-blue-200 text-lg">
              {summary?.ip || deviceSession?.device_info?.ip_address || 'Device Management'}
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

          {/* Tabs */}
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
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8">
            {activeTab === 'Summary' && (
              <SummaryTab summary={summary} config={config} />
            )}

            {activeTab === 'Monitoring' && (
              <MonitoringTab 
                monitoring={monitoring}
                chartData={chartData}
                isBackendConnected={isBackendConnected}
                sessionId={sessionId}
              />
            )}

            {activeTab === 'Configuration' && (
              <ConfigurationTab
                config={config}
                onChange={handleConfigChange}
                onSave={handleConfigSave}
                isLoading={isLoading}
                isBackendConnected={isBackendConnected}
                sessionId={sessionId}
              />
            )}

            {activeTab === 'Firmware' && (
              <FirmwareTab
                firmware={summary?.firmware}
                sessionId={sessionId}
                isBackendConnected={isBackendConnected}
              />
            )}

            {activeTab === 'Logs' && (
              <LogsTab
                logs={logs}
                onDownload={handleDownloadLogs}
                followTail={followTail}
                setFollowTail={setFollowTail}
                logsContainerRef={logsContainerRef}
                logsEndRef={logsEndRef}
                onScroll={handleLogsScroll}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const InfoField = ({ label, value }) => (
  <div className="mb-3">
    <div className="text-blue-300 text-xs uppercase tracking-wide mb-1">{label}</div>
    <div className="text-white font-semibold">{value || '—'}</div>
  </div>
);

const InfoCard = ({ label, value }) => (
  <div className="bg-blue-900/40 rounded-md p-3 border border-blue-800/50">
    <div className="text-xs uppercase tracking-wide text-blue-300 mb-1">{label}</div>
    <div className="text-sm text-white font-semibold break-all">{value ?? '—'}</div>
  </div>
);

// Tab Components
const SummaryTab = ({ summary, config }) => (
  <div className="space-y-6">
    {/* Qual Section */}
    <div className="bg-blue-900/60 rounded-xl p-6 border border-blue-800/50">
      <h3 className="text-white font-semibold mb-4">Qual</h3>
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Bitrate" value={config.bitrate || summary?.bitrate || '—'} />
        <InfoCard label="Profile" value={config.profile || summary?.profile || '—'} />
        <InfoCard label="Iptos" value={config.iptos || summary?.iptos || '—'} />
        <InfoCard label="Type" value={config.type || summary?.type || '—'} />
      </div>
    </div>

    {/* RTSP/URL Section */}
    <div className="bg-blue-900/60 rounded-xl p-6 border border-blue-800/50">
      <h3 className="text-white font-semibold mb-4">RTSP/URL</h3>
      <div className="space-y-3">
        <RTSPField label="Cam1URL" value={config.cam1URL || 'rtsp://192.168.66.129/1234/h264multicast/4567.sdp'} />
        <RTSPField label="Cam2URL" value={config.cam2URL || 'rtsp://192.168.66.129/1234/h264multicast/4568.sdp'} />
        <RTSPField label="Cam3URL" value={config.cam3URL || 'rtsp://192.168.66.129/1234/h264multicast/4569.sdp'} />
        <RTSPField label="Cam4URL" value={config.cam4URL || 'rtsp://192.168.66.129/1234/h264multicast/4570.sdp'} />
      </div>
    </div>

    {/* System Info */}
    <div className="bg-blue-900/60 rounded-xl p-6 border border-blue-800/50">
      <h3 className="text-white font-semibold mb-4">System Information</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoCard label="Vendor" value={summary?.vendor || 'KeyWest'} />
        <InfoCard label="Model" value={summary?.model || 'T901'} />
        <InfoCard label="Firmware" value={summary?.firmware || '—'} />
        <InfoCard label="IP Address" value={summary?.ip || '—'} />
        <InfoCard label="System Name" value={summary?.sysName || '—'} />
        <InfoCard label="Uptime" value={summary?.uptimeSeconds ? `${Math.floor(summary.uptimeSeconds / 3600)} hours` : '—'} />
      </div>
    </div>
  </div>
);

const RTSPField = ({ label, value }) => (
  <div className="flex items-center gap-3">
    <label className="text-blue-200 text-sm w-24">{label}</label>
    <input
      type="text"
      value={value || '—'}
      readOnly
      className="flex-1 rounded-md bg-blue-900/60 text-blue-100 px-3 py-2 border border-blue-800/50 text-sm font-mono"
    />
    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition">
      Edit
    </button>
  </div>
);

const MonitoringTab = ({ monitoring, chartData, isBackendConnected, sessionId }) => (
  <div className="space-y-6">
    {/* Key Metrics Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="CPU Usage" value={`${monitoring.cpu}%`} isLive={isBackendConnected && sessionId} />
      <MetricCard label="Memory Usage" value={`${monitoring.memory}%`} isLive={isBackendConnected && sessionId} />
      <MetricCard label="Temperature" value={`${monitoring.temperature}°C`} isLive={isBackendConnected && sessionId} />
      <MetricCard label="Input Signal" value={monitoring.inputSignal} isLive={isBackendConnected && sessionId} />
    </div>

    {/* Performance Charts */}
    <div className="bg-blue-900/60 rounded-xl p-6">
      <div className="text-blue-100 mb-4 font-semibold flex items-center gap-2">
        Device Performance
        {isBackendConnected && sessionId ? (
          <span className="text-xs text-green-400">(Live · 5s interval)</span>
        ) : (
          <span className="text-xs text-yellow-400">(Demo mode)</span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Chart */}
        <div className="h-64 bg-blue-900/50 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
              <XAxis dataKey="t" tick={{ fill: '#93c5fd', fontSize: 12 }} hide />
              <YAxis tick={{ fill: '#93c5fd', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e3a8a', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#93c5fd' }} />
              <Line type="monotone" dataKey="cpu" stroke="#f59e0b" strokeWidth={2} dot={false} name="CPU (%)" />
              <Line type="monotone" dataKey="memory" stroke="#22d3ee" strokeWidth={2} dot={false} name="Memory (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Temperature Chart */}
        <div className="h-64 bg-blue-900/50 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a8a" />
              <XAxis dataKey="t" tick={{ fill: '#93c5fd', fontSize: 12 }} hide />
              <YAxis tick={{ fill: '#93c5fd', fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e3a8a', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#93c5fd' }} />
              <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} name="Temperature (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* Stream Status */}
    <div className="bg-blue-900/60 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Stream Status</h3>
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Input Signal" value={monitoring.inputSignal} />
        <InfoCard label="Output Stream" value={monitoring.outputStream} />
      </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, isLive }) => (
  <div className="bg-blue-900/60 rounded-xl p-4 flex flex-col items-start relative">
    <div className="text-blue-100 text-sm mb-2">{label}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {isLive && (
      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Live Data" />
    )}
  </div>
);

const ConfigurationTab = ({ config, onChange, onSave, isLoading, isBackendConnected, sessionId }) => (
  <form onSubmit={onSave} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-blue-100 mb-2">Bitrate</label>
        <input
          className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
          name="bitrate"
          value={config.bitrate || ''}
          onChange={onChange}
          placeholder="e.g., 5000"
        />
      </div>
      <div>
        <label className="block text-blue-100 mb-2">Profile</label>
        <input
          className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
          name="profile"
          value={config.profile || ''}
          onChange={onChange}
          placeholder="e.g., High"
        />
      </div>
      <div>
        <label className="block text-blue-100 mb-2">IPTOS</label>
        <input
          className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
          name="iptos"
          value={config.iptos || ''}
          onChange={onChange}
          placeholder="e.g., 184"
        />
      </div>
      <div>
        <label className="block text-blue-100 mb-2">Type</label>
        <input
          className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400"
          name="type"
          value={config.type || ''}
          onChange={onChange}
          placeholder="e.g., H.264"
        />
      </div>
    </div>

    <div className="border-t border-blue-700 pt-6">
      <h3 className="text-white font-semibold mb-4">Camera URLs</h3>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(num => (
          <div key={num}>
            <label className="block text-blue-100 mb-2">Camera {num} URL</label>
            <input
              className="w-full rounded-md bg-blue-900/60 text-blue-100 px-4 py-2 border-none focus:ring-2 focus:ring-cyan-400 font-mono text-sm"
              name={`cam${num}URL`}
              value={config[`cam${num}URL`] || ''}
              onChange={onChange}
              placeholder={`rtsp://...`}
            />
          </div>
        ))}
      </div>
    </div>

    <div className="flex justify-end">
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
);

const FirmwareTab = ({ firmware, sessionId, isBackendConnected }) => (
  <div className="space-y-6">
    <div className="bg-blue-900/60 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Current Firmware</h3>
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Version" value={firmware || 'Unknown'} />
        <InfoCard label="Status" value={isBackendConnected ? 'Connected' : 'Demo Mode'} />
      </div>
    </div>

    <div className="bg-blue-900/60 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Firmware Upgrade</h3>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".bin,.img,.tar,.zip"
          className="text-blue-100"
          disabled={!isBackendConnected || !sessionId}
        />
        <button
          type="button"
          disabled={!isBackendConnected || !sessionId}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-md shadow transition"
        >
          <UploadCloud size={18} className="inline mr-2" />
          Upload Firmware
        </button>
      </div>
      {!isBackendConnected && (
        <div className="text-yellow-300 text-sm mt-3">Backend not connected. Firmware upgrade unavailable.</div>
      )}
    </div>
  </div>
);

const LogsTab = ({ logs, onDownload, followTail, setFollowTail, logsContainerRef, logsEndRef, onScroll }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <div className="text-blue-100 text-lg font-semibold">System Logs</div>
      <div className="flex gap-2">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 transition"
          onClick={onDownload}
        >
          <Download size={18} />
          Download
        </button>
      </div>
    </div>

    <div className="bg-blue-900/80 rounded-xl p-4">
      {logs.length === 0 ? (
        <div className="text-blue-300 text-center py-8">No logs available.</div>
      ) : (
        <div>
          <div
            ref={logsContainerRef}
            onScroll={onScroll}
            className="max-h-[60vh] overflow-auto rounded-md"
            style={{ background: '#0f172a' }}
          >
            {logs.map((log, idx) => (
              <div
                key={idx}
                className="font-mono text-sm mb-2 px-2 py-1"
                style={{
                  color: log.type === 'WARN' ? '#facc15' : log.type === 'INFO' ? '#22d3ee' : '#fff',
                  borderLeft: log.type === 'WARN' ? '4px solid #facc15' : log.type === 'INFO' ? '4px solid #22d3ee' : 'none'
                }}
              >
                <span className="text-blue-300">{log.time}</span>{' '}
                <span className={log.type === 'WARN' ? 'text-yellow-400' : log.type === 'INFO' ? 'text-cyan-400' : 'text-white'}>
                  {log.type}
                </span>
                : {log.message}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
          <div className="flex items-center justify-end gap-3 mt-2 text-xs text-blue-200">
            <label className="inline-flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-cyan-400"
                checked={followTail}
                onChange={(e) => setFollowTail(e.target.checked)}
              />
              Follow live
            </label>
            <button
              type="button"
              onClick={() => {
                const el = logsContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
                setFollowTail(true);
              }}
              className="px-2 py-1 rounded bg-blue-700 text-white hover:bg-blue-600"
            >
              Jump to bottom
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default TranscoderDetail;
