import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Settings, Upload, FileText, Activity,
  Thermometer, Cpu, HardDrive, AlertTriangle,
  Edit2, Save, X, Video
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

const StreamField = ({ label, url, onEdit }) => (
  <div className="bg-gray-700/30 rounded p-3 mb-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-gray-400 text-xs">{label}</span>
      <button onClick={onEdit} className="text-cyan-400 hover:text-cyan-300">
        <Edit2 size={12} />
      </button>
    </div>
    <div className="text-white text-xs font-mono break-all">{url || 'Not configured'}</div>
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
        console.error('Failed to fetch encoder summary:', error);
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
      {/* Quad Section */}
      <InfoCard title="Quad">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <StreamField 
              label="Encoder" 
              url={summary?.quad?.encoder || "N/A"}
              onEdit={() => {}}
            />
            <StreamField 
              label="Profile" 
              url={summary?.quad?.profile || "main"}
              onEdit={() => {}}
            />
          </div>
          <div>
            <StreamField 
              label="Xpos" 
              url={summary?.quad?.xpos || "0"}
              onEdit={() => {}}
            />
            <StreamField 
              label="Ypos" 
              url={summary?.quad?.ypos || "0"}
              onEdit={() => {}}
            />
          </div>
        </div>
      </InfoCard>

      {/* RTSP/RTP Section */}
      <InfoCard title="RTSP/RTP">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <StreamField 
              label="CamID/URL" 
              url={summary?.rtsp?.camIdUrl || "rtsp://192.168.1.100:554/stream1"}
              onEdit={() => {}}
            />
            <StreamField 
              label="CamID/URL" 
              url={summary?.rtsp?.camIdUrl2 || "rtsp://192.168.1.101:554/stream1"}
              onEdit={() => {}}
            />
          </div>
          <div>
            <StreamField 
              label="CamID/URL" 
              url={summary?.rtsp?.camIdUrl3 || "rtsp://192.168.1.102:554/stream1"}
              onEdit={() => {}}
            />
            <StreamField 
              label="CamID/URL" 
              url={summary?.rtsp?.camIdUrl4 || "rtsp://192.168.1.103:554/stream1"}
              onEdit={() => {}}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input 
            type="text" 
            placeholder="Start Index" 
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
          />
          <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded text-sm">
            Submit
          </button>
        </div>
      </InfoCard>

      {/* HDMI Section */}
      <InfoCard title="HDMI">
        <div className="grid grid-cols-2 gap-4">
          <StreamField 
            label="Input Status" 
            url={summary?.hdmi?.inputStatus || "Connected"}
            onEdit={() => {}}
          />
          <StreamField 
            label="Resolution" 
            url={summary?.hdmi?.resolution || "1920x1080"}
            onEdit={() => {}}
          />
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
    bandwidth: { current: 0, history: [] }
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
          bandwidth: {
            current: 45.2,
            history: Array.from({ length: 20 }, (_, i) => ({
              timestamp: new Date(Date.now() - (20 - i) * 3000).toISOString(),
              value: 40 + Math.random() * 15
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
          icon={Activity}
          label="Bandwidth"
          value={metrics.bandwidth.current.toFixed(1)}
          unit=" Mbps"
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

        <InfoCard title="Bandwidth History">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.bandwidth.history}>
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
        <h3 className="text-white text-lg font-semibold">Encoder Configuration</h3>
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
        <InfoCard title="Video Settings">
          <div className="space-y-3">
            {['resolution', 'framerate', 'bitrate', 'codec'].map((field) => (
              <div key={field}>
                <label className="text-gray-400 text-xs uppercase">{field}</label>
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

        <InfoCard title="Network Settings">
          <div className="space-y-3">
            {['ip_address', 'subnet_mask', 'gateway', 'multicast_address'].map((field) => (
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

        <InfoCard title="Streaming Settings">
          <div className="space-y-3">
            {['protocol', 'port', 'stream_name', 'encryption'].map((field) => (
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

        <InfoCard title="Audio Settings">
          <div className="space-y-3">
            {['audio_codec', 'sample_rate', 'channels', 'audio_bitrate'].map((field) => (
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

      // Simulate upload progress
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
              accept=".bin,.fw,.hex"
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
                <strong>Warning:</strong> Firmware update will restart the device. Ensure no critical operations are in progress.
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
    // Simulate logs
    const sampleLogs = [
      { timestamp: new Date().toISOString(), level: 'INFO', message: 'Encoder stream started successfully' },
      { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'INFO', message: 'Video input detected: 1920x1080@30fps' },
      { timestamp: new Date(Date.now() - 10000).toISOString(), level: 'WARNING', message: 'High CPU usage detected: 78%' },
      { timestamp: new Date(Date.now() - 15000).toISOString(), level: 'INFO', message: 'Audio codec initialized: AAC' },
      { timestamp: new Date(Date.now() - 20000).toISOString(), level: 'ERROR', message: 'RTSP stream connection timeout' },
      { timestamp: new Date(Date.now() - 25000).toISOString(), level: 'INFO', message: 'Network configuration updated' },
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
const EncoderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        // Get session ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdFromUrl = urlParams.get('session');
        
        if (sessionIdFromUrl) {
          setSessionId(parseInt(sessionIdFromUrl));
          setDeviceInfo({
            ip: id,
            name: 'KeyWest Encoder',
            model: 'E801',
            firmwareVersion: '2.8.4',
            hardwareVersion: 'Rev C',
            serialNumber: 'ENC' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            uptime: '15 days 4 hours',
            status: 'online'
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
        <div className="text-white text-xl">Loading encoder details...</div>
      </div>
    );
  }

  if (!deviceInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900 flex items-center justify-center">
        <div className="text-white text-xl">Encoder not found</div>
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
            <h1 className="text-3xl font-bold text-white mb-2">Encoder Management</h1>
            <p className="text-cyan-200">KeyWest Element Management System</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-500 w-3 h-3 rounded-full animate-pulse"></div>
            <span className="text-white">Device Online</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left Sidebar */}
        <div className="w-80 space-y-4">
          {/* Device Image */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <div className="bg-gray-700 rounded-lg p-8 mb-4 flex items-center justify-center">
              <Video size={80} className="text-cyan-400" />
            </div>
            <div className="text-center">
              <div className="text-white font-semibold text-lg mb-1">{deviceInfo.name}</div>
              <div className="text-gray-400 text-sm">{deviceInfo.ip}</div>
            </div>
          </div>

          {/* Device Info */}
          <InfoCard title="Device Information">
            <InfoField label="Model" value={deviceInfo.model} />
            <InfoField label="Serial Number" value={deviceInfo.serialNumber} />
            <InfoField label="Firmware" value={deviceInfo.firmwareVersion} />
            <InfoField label="Hardware" value={deviceInfo.hardwareVersion} />
            <InfoField label="Uptime" value={deviceInfo.uptime} />
            <InfoField label="Status" value={deviceInfo.status} />
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

export default EncoderDetail;
