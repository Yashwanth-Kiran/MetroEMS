import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Settings, Upload, FileText, Activity,
  Thermometer, Cpu, HardDrive, AlertTriangle,
  Edit2, Save, X, Train
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../services/apiService';

// Helper Components
const InfoField = ({ label, value, editable, onEdit }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-700">
    <span className="text-gray-400 text-sm">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-white text-sm font-medium">{value || 'N/A'}</span>
      {editable && (
        <button onClick={onEdit} className="text-cyan-400 hover:text-cyan-300">
          <Edit2 size={14} />
        </button>
      )}
    </div>
  </div>
);

const InfoCard = ({ title, children, className = '' }) => (
  <div className={`bg-gray-800/50 rounded-lg p-4 ${className}`}>
    <h3 className="text-white font-semibold mb-3 text-sm">{title}</h3>
    {children}
  </div>
);

const MetricCard = ({ icon: Icon, label, value, unit, status = 'normal' }) => {
  const statusColors = {
    normal: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400'
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon size={20} className="text-cyan-400" />
        <span className={`text-2xl font-bold ${statusColors[status]}`}>
          {value}{unit}
        </span>
      </div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
};

// Tab Components
const SummaryTab = ({ sessionId, deviceIp }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await apiService.getDeviceSessionSummary(sessionId);
        setSummary(data);
      } catch (error) {
        console.error('Failed to fetch OBC summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) return <div className="text-white p-4">Loading summary...</div>;

  return (
    <div className="space-y-4">
      {/* Cab Information */}
      <InfoCard title="Cab Information">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <InfoField label="Cab Number" value={summary?.cab_number || "5921"} />
            <InfoField label="Position" value={summary?.position || "Prd d 15 h 20 m"} />
            <InfoField label="IP Address" value={deviceIp} />
          </div>
          <div>
            <InfoField label="Encoder" value={summary?.encoder_ip || "10.205.3.250"} />
            <InfoField label="NTP" value={summary?.ntp_server || "10.205.0.2"} />
            <InfoField label="Status" value={summary?.status || "Online"} />
          </div>
        </div>
      </InfoCard>

      {/* Storage Information */}
      <InfoCard title="Storage Information">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total Storage</span>
            <span className="text-white font-semibold">{summary?.storage?.total || "467.89 GB"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Free Space</span>
            <span className="text-green-400 font-semibold">{summary?.storage?.free || "174.07 GB"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Used Space</span>
            <span className="text-orange-400 font-semibold">{summary?.storage?.used || "293.82 GB"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Usage Percentage</span>
            <span className="text-cyan-400 font-semibold">{summary?.storage?.percentage || "37.20%"}</span>
          </div>
          
          {/* Storage Usage Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: summary?.storage?.percentage || "37.20%" }}
              />
            </div>
          </div>
        </div>
      </InfoCard>

      {/* System Information */}
      <InfoCard title="System Information">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <InfoField label="OS Version" value={summary?.os_version || "Ubuntu 20.04 LTS"} />
            <InfoField label="Kernel" value={summary?.kernel || "5.4.0-150-generic"} />
            <InfoField label="Uptime" value={summary?.uptime || "45 days 12 hours"} />
          </div>
          <div>
            <InfoField label="CPU Model" value={summary?.cpu_model || "Intel i7-8565U"} />
            <InfoField label="Memory" value={summary?.total_memory || "16 GB"} />
            <InfoField label="GPS Status" value={summary?.gps_status || "Active"} />
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

const MonitoringTab = ({ sessionId, deviceIp }) => {
  const [metrics, setMetrics] = useState({
    cpu: { current: 0, history: [] },
    memory: { current: 0, history: [] },
    temperature: { current: 0, history: [] },
    storage: { current: 0, history: [] }
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [cpuData, memData, tempData] = await Promise.all([
          apiService.getMetricTimeseries(deviceIp, 'cpu', 1),
          apiService.getMetricTimeseries(deviceIp, 'memory', 1),
          apiService.getMetricTimeseries(deviceIp, 'temperature', 1)
        ]);

        setMetrics({
          cpu: { 
            current: cpuData[cpuData.length - 1]?.value || 0, 
            history: cpuData 
          },
          memory: { 
            current: memData[memData.length - 1]?.value || 0, 
            history: memData 
          },
          temperature: { 
            current: tempData[tempData.length - 1]?.value || 0, 
            history: tempData 
          },
          storage: {
            current: 37.2,
            history: Array.from({ length: 20 }, (_, i) => ({
              timestamp: new Date(Date.now() - (20 - i) * 3000).toISOString(),
              value: 35 + Math.random() * 5
            }))
          }
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [deviceIp]);

  const getCpuStatus = (value) => {
    if (value > 80) return 'critical';
    if (value > 60) return 'warning';
    return 'normal';
  };

  const getMemoryStatus = (value) => {
    if (value > 85) return 'critical';
    if (value > 70) return 'warning';
    return 'normal';
  };

  const getTempStatus = (value) => {
    if (value > 75) return 'critical';
    if (value > 60) return 'warning';
    return 'normal';
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard 
          icon={Cpu}
          label="CPU Usage"
          value={metrics.cpu.current.toFixed(1)}
          unit="%"
          status={getCpuStatus(metrics.cpu.current)}
        />
        <MetricCard 
          icon={HardDrive}
          label="Memory"
          value={metrics.memory.current.toFixed(1)}
          unit="%"
          status={getMemoryStatus(metrics.memory.current)}
        />
        <MetricCard 
          icon={Thermometer}
          label="Temperature"
          value={metrics.temperature.current.toFixed(1)}
          unit="°C"
          status={getTempStatus(metrics.temperature.current)}
        />
        <MetricCard 
          icon={HardDrive}
          label="Storage Usage"
          value={metrics.storage.current.toFixed(1)}
          unit="%"
          status="normal"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="CPU Usage History">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.cpu.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </InfoCard>

        <InfoCard title="Memory Usage History">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.memory.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </InfoCard>

        <InfoCard title="Temperature History">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.temperature.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </InfoCard>

        <InfoCard title="Storage Usage History">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.storage.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </InfoCard>
      </div>
    </div>
  );
};

const ConfigurationTab = ({ sessionId, deviceIp }) => {
  const [config, setConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await apiService.getDeviceSessionConfig(sessionId);
        setConfig(data);
        setEditedConfig(data);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    };

    fetchConfig();
  }, [sessionId]);

  const handleSave = async () => {
    try {
      await apiService.updateDeviceSessionConfig(sessionId, editedConfig);
      setConfig(editedConfig);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  if (!config) return <div className="text-white p-4">Loading configuration...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold">OBC Configuration</h3>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedConfig(config);
                }}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded"
            >
              <Edit2 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="Network Settings">
          <div className="space-y-3">
            {['ip_address', 'subnet_mask', 'gateway', 'dns_server'].map((field) => (
              <div key={field}>
                <label className="text-gray-400 text-xs uppercase">{field.replace('_', ' ')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedConfig[field] || ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, [field]: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                  />
                ) : (
                  <div className="text-white mt-1">{config[field] || 'N/A'}</div>
                )}
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="Encoder Settings">
          <div className="space-y-3">
            {['encoder_ip', 'encoder_port', 'stream_protocol', 'video_quality'].map((field) => (
              <div key={field}>
                <label className="text-gray-400 text-xs uppercase">{field.replace('_', ' ')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedConfig[field] || ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, [field]: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                  />
                ) : (
                  <div className="text-white mt-1">{config[field] || 'N/A'}</div>
                )}
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="GPS/Location Settings">
          <div className="space-y-3">
            {['gps_enabled', 'update_interval', 'position_accuracy', 'altitude_tracking'].map((field) => (
              <div key={field}>
                <label className="text-gray-400 text-xs uppercase">{field.replace('_', ' ')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedConfig[field] || ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, [field]: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                  />
                ) : (
                  <div className="text-white mt-1">{config[field] || 'N/A'}</div>
                )}
              </div>
            ))}
          </div>
        </InfoCard>

        <InfoCard title="System Settings">
          <div className="space-y-3">
            {['ntp_server', 'timezone', 'auto_update', 'log_level'].map((field) => (
              <div key={field}>
                <label className="text-gray-400 text-xs uppercase">{field.replace('_', ' ')}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedConfig[field] || ''}
                    onChange={(e) => setEditedConfig({ ...editedConfig, [field]: e.target.value })}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                  />
                ) : (
                  <div className="text-white mt-1">{config[field] || 'N/A'}</div>
                )}
              </div>
            ))}
          </div>
        </InfoCard>
      </div>
    </div>
  );
};

const FirmwareTab = ({ sessionId }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      await apiService.uploadFirmware(sessionId, formData);
      
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setFile(null);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Firmware upload failed:', error);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <InfoCard title="Firmware Update">
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Select Firmware File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              accept=".bin,.fw,.img,.deb"
              disabled={uploading}
            />
          </div>

          {file && (
            <div className="bg-gray-700/30 rounded p-3">
              <div className="text-white text-sm mb-1">Selected: {file.name}</div>
              <div className="text-gray-400 text-xs">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
          )}

          {uploading && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-cyan-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Firmware'}
          </button>

          <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mt-4">
            <div className="flex gap-2">
              <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-200 text-sm">
                <strong>Warning:</strong> Firmware update will restart the OBC system. Ensure the train is stationary and no critical operations are in progress.
              </div>
            </div>
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

const LogsTab = ({ sessionId, deviceIp }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const sampleLogs = [
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'OBC system initialized successfully' },
      { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'INFO', message: 'GPS position updated: Lat 40.7128, Lon -74.0060' },
      { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'WARNING', message: 'Storage usage above 35%' },
      { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'INFO', message: 'Encoder connection established' },
      { timestamp: new Date(Date.now() - 20000).toISOString(), level: 'ERROR', message: 'NTP sync failed, using local time' },
      { timestamp: new Date(Date.now() - 25000).toISOString(), level: 'INFO', message: 'Train position updated: Prd d 15 h 20 m' },
    ];
    setLogs(sampleLogs);

    const interval = setInterval(() => {
      const newLog = {
        timestamp: new Date().toISOString(),
        level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)],
        message: `System event ${Math.random().toString(36).substr(2, 9)}`
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 100));
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionId]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter((log) => log.level.toLowerCase() === filter);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARNING': return 'text-yellow-400';
      case 'INFO': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'info', 'warning', 'error'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm ${
              filter === f
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
        {filteredLogs.map((log, idx) => (
          <div key={idx} className="mb-2 flex gap-3">
            <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={getLevelColor(log.level)}>[{log.level}]</span>
            <span className="text-gray-300">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Component
const OBCDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdFromUrl = urlParams.get('session');
        
        if (sessionIdFromUrl) {
          setSessionId(parseInt(sessionIdFromUrl));
          setDeviceInfo({
            ip: id,
            name: 'OBC System',
            model: 'OBC-5921',
            cabNumber: '5921',
            firmwareVersion: '3.2.1',
            hardwareVersion: 'Rev B',
            serialNumber: 'OBC' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            uptime: '45 days 12 hours',
            status: 'online',
            storage: {
              total: '467.89 GB',
              free: '174.07 GB',
              used: '293.82 GB',
              percentage: '37.20%'
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch device info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeviceInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading OBC details...</div>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 flex items-center justify-center">
        <div className="text-white text-xl">OBC not found</div>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Monitor },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'firmware', label: 'Firmware', icon: Upload },
    { id: 'logs', label: 'Logs', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-cyan-300 hover:text-cyan-200 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">On-Board Computer Management</h1>
            <p className="text-cyan-200">Metro Element Management System - Cab {deviceInfo.cabNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
            <span className="text-white">System Online</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-80 space-y-4">
          {/* Device Icon */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="bg-gray-700 rounded-lg p-8 mb-4 flex flex-col items-center justify-center">
              <Train size={60} className="text-cyan-400 mb-4" />
              <div className="text-center">
                <div className="text-white font-bold text-xl mb-1">Cab - {deviceInfo.cabNumber}</div>
                <div className="text-gray-400 text-sm">Prd d 15 h 20 m</div>
              </div>
            </div>
          </div>

          {/* Device Info */}
          <InfoCard title="Device Information">
            <InfoField label="IP" value={deviceInfo.ip} />
            <InfoField label="Encoder" value="10.205.3.250" />
            <InfoField label="NTP" value="10.205.0.2" />
            <InfoField label="Firmware" value={deviceInfo.firmwareVersion} />
            <InfoField label="Uptime" value={deviceInfo.uptime} />
          </InfoCard>

          {/* Storage Info */}
          <InfoCard title="Storage">
            <InfoField label="Total" value={deviceInfo.storage.total} />
            <InfoField label="Free" value={deviceInfo.storage.free} />
            <InfoField label="Used" value={deviceInfo.storage.used} />
            <InfoField label="Percentage" value={deviceInfo.storage.percentage} />
            <div className="mt-3 w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-cyan-600 h-2 rounded-full"
                style={{ width: deviceInfo.storage.percentage }}
              />
            </div>
          </InfoCard>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="bg-gray-800/50 rounded-lg mb-4">
            <div className="flex border-b border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-cyan-600 text-white border-b-2 border-cyan-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            {activeTab === 'summary' && <SummaryTab sessionId={sessionId} deviceIp={id} />}
            {activeTab === 'monitoring' && <MonitoringTab sessionId={sessionId} deviceIp={id} />}
            {activeTab === 'configuration' && <ConfigurationTab sessionId={sessionId} deviceIp={id} />}
            {activeTab === 'firmware' && <FirmwareTab sessionId={sessionId} />}
            {activeTab === 'logs' && <LogsTab sessionId={sessionId} deviceIp={id} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OBCDetail;
