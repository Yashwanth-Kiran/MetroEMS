import React, { useState, useEffect } from 'react';
import DeviceSummary from './DeviceSummary';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/apiService';
import {
  Radio,
  Train,
  Cpu,
  Disc,
  Server,
  SlidersHorizontal,
  ArrowRight,
  Wifi,
  MonitorSmartphone,
  Tv,
  Camera,
  User,
  Cpu as CpuChip,
  Box,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

// Map UI category to backend device_type and default icon
const categoryMap = {
  'Station Radios': { type: 'station_radio', icon: (size=32)=> <Wifi size={size} className="text-cyan-300" /> },
  'Train Radios':   { type: 'train_radio',   icon: (size=32)=> <MonitorSmartphone size={size} className="text-cyan-300" /> },
  'Transcoder':     { type: 'transcoder',     icon: (size=32)=> <Tv size={size} className="text-cyan-300" /> },
  'Encoder':        { type: 'encoder',        icon: (size=32)=> <Camera size={size} className="text-cyan-300" /> },
  'OBC':            { type: 'obc',            icon: (size=32)=> <CpuChip size={size} className="text-cyan-300" /> },
  'IO Box Controller': { type: 'io_box',      icon: (size=32)=> <Box size={size} className="text-cyan-300" /> },
};

const elements = [
  {
    name: 'Station Radios',
    icon: <Radio size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
  {
    name: 'Train Radios',
    icon: <Train size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
  {
    name: 'Transcoder',
    icon: <Cpu size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
  {
    name: 'Encoder',
    icon: <Disc size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
  {
    name: 'OBC',
    icon: <Server size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
  {
    name: 'IO Box Controller',
    icon: <SlidersHorizontal size={40} strokeWidth={2.2} className="text-cyan-400" />,
    desc: 'Manage Device',
    color: 'from-cyan-400 to-blue-400',
  },
];

function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [targetIp, setTargetIp] = useState('');
  const [community, setCommunity] = useState('public');
  const [ifIndex, setIfIndex] = useState('');
  const [signalOid, setSignalOid] = useState('');
  const [snrOid, setSnrOid] = useState('');
  const [logBaseOid, setLogBaseOid] = useState('');
  // load persisted discovery params
  useEffect(() => {
    const lastIp = localStorage.getItem('metro_last_target_ip');
    const lastComm = localStorage.getItem('metro_last_community');
    const lastIfIndex = localStorage.getItem('metro_last_ifindex');
    const lastSignalOid = localStorage.getItem('metro_last_signal_oid');
    const lastSnrOid = localStorage.getItem('metro_last_snr_oid');
    const lastLogBase = localStorage.getItem('metro_last_log_base_oid');
    if (lastIp) setTargetIp(lastIp);
    if (lastComm) setCommunity(lastComm);
    if (lastIfIndex) setIfIndex(lastIfIndex);
    if (lastSignalOid) setSignalOid(lastSignalOid);
    if (lastSnrOid) setSnrOid(lastSnrOid);
    if (lastLogBase) setLogBaseOid(lastLogBase);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  
  const username = location.state?.username || '';
  const fromBackend = location.state?.fromBackend || false;

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const isAvailable = await apiService.isBackendAvailable();
      setIsBackendConnected(isAvailable);
      if (!isAvailable) {
        setDiscoveryError('Backend server not available. Using demo mode.');
      }
    } catch (error) {
      setIsBackendConnected(false);
      setDiscoveryError('Failed to connect to backend server.');
    }
  };

  const discoverByCategory = async (category) => {
    setIsDiscovering(true);
    setDiscoveryError('');
    
    try {
      if (!isBackendConnected) {
        throw new Error('Backend server not available');
      }

      // persist parameters
      if (targetIp) localStorage.setItem('metro_last_target_ip', targetIp);
      if (community) localStorage.setItem('metro_last_community', community);
      if (ifIndex) localStorage.setItem('metro_last_ifindex', ifIndex);
      if (signalOid) localStorage.setItem('metro_last_signal_oid', signalOid);
      if (snrOid) localStorage.setItem('metro_last_snr_oid', snrOid);
      if (logBaseOid) localStorage.setItem('metro_last_log_base_oid', logBaseOid);
      const deviceType = categoryMap[category]?.type || 'station_radio';
      const response = await apiService.discoverDevices(deviceType, {
        ip: targetIp || undefined,
        community: community || undefined
      });
      const devices = response.candidates || [];
      
      // Convert discovered devices to the expected format
      const formattedDevices = devices.map((device, index) => ({
        id: `discovered_${index}`,
        name: device.description || `${category} at ${device.ip}`,
        ip: device.ip,
        icon: categoryMap[category]?.icon(32) || <Wifi size={32} className="text-cyan-300" />,
        isReal: true,
        status: 'discovered'
      }));

      if (formattedDevices.length === 0) {
        setDiscoveryError(`No ${category} devices found on the network.`);
      }

      setDiscoveredDevices(formattedDevices);
    } catch (error) {
      console.error('Device discovery failed:', error);
      setDiscoveryError(`Discovery failed: ${error.message}`);
      setDiscoveredDevices([]);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleCardClick = (name) => {
    setSelectedCategory(name);
    
    // For any category, start device discovery
    discoverByCategory(name);
  };

  const handleDeviceClick = async (device, category) => {
    if (device.ip) {
      try {
        // Start a session for the device
        const deviceType = categoryMap[category]?.type || 'station_radio';
        const sessionResponse = await apiService.startSession(
          device.ip,
          deviceType,
          username,
          {
            community,
            ifIndex: ifIndex ? Number(ifIndex) : undefined,
            signal_oid: signalOid || undefined,
            snr_oid: snrOid || undefined,
            log_base_oid: logBaseOid || undefined,
          }
        );
        
        // Only pass JSON-serializable data in history state (exclude React elements like `icon`)
        const devicePlain = {
          id: device.id,
          name: device.name,
          ip: device.ip,
          isReal: !!device.isReal,
          status: device.status || 'discovered'
        };

        // Navigate to specific device page based on type
        // Transcoder, Encoder, and OBC have their own dedicated UIs
        if (category === 'Transcoder') {
          navigate(`/transcoder/${device.ip}?session=${encodeURIComponent(sessionResponse.session_id)}`, {
            state: {
              deviceInfo: devicePlain,
              sessionId: sessionResponse.session_id,
              fromBackend: isBackendConnected
            }
          });
        } else if (category === 'Encoder') {
          navigate(`/encoder/${device.ip}?session=${encodeURIComponent(sessionResponse.session_id)}`, {
            state: {
              deviceInfo: devicePlain,
              sessionId: sessionResponse.session_id,
              fromBackend: isBackendConnected
            }
          });
        } else if (category === 'OBC') {
          navigate(`/obc/${device.ip}?session=${encodeURIComponent(sessionResponse.session_id)}`, {
            state: {
              deviceInfo: devicePlain,
              sessionId: sessionResponse.session_id,
              fromBackend: isBackendConnected
            }
          });
        } else {
          // Navigate to generic device management for other device types
          navigate(`/device/${encodeURIComponent(category)}/${device.id}?session=${encodeURIComponent(sessionResponse.session_id)}`, {
            state: {
              deviceInfo: devicePlain,
              sessionId: sessionResponse.session_id,
              fromBackend: isBackendConnected
            }
          });
        }
      } catch (error) {
        console.error('Failed to start session:', error);
        // Do NOT navigate to a fake route; surface an error and keep the user here
        setDiscoveryError(`Failed to start session for ${device.ip}: ${error.message}`);
      }
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setDiscoveredDevices([]);
    setDiscoveryError('');
  };

  const getDeviceList = (category) => {
    return discoveredDevices;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="w-full max-w-5xl mx-auto flex">
        {/* Left side welcome message and customer dashboard link */}
        <div className="flex flex-col items-start justify-start mr-8 min-w-[200px] space-y-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg px-6 py-4 mt-8">
            <span className="text-lg text-white font-semibold">{username ? `Welcome, ${username}` : "Welcome"}</span>
          </div>
          <button
            onClick={() => navigate('/customer-dashboard')}
            className="bg-blue-600/80 backdrop-blur-md hover:bg-blue-700 rounded-xl shadow-lg px-6 py-4 transition flex items-center gap-2 text-white font-semibold"
          >
            <User size={20} />
            My Account
          </button>
        </div>
        <div className="flex-1">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow">MetroEMS Dashboard</h1>
            <div className="text-blue-200 text-lg font-medium drop-shadow">Metro Element Management System</div>
          </div>

          {/* Device List for Selected Category */}
          {selectedCategory ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8">
              <button
                onClick={handleBack}
                className="mb-6 text-blue-200 hover:text-white font-semibold flex items-center gap-2"
              >
                <ArrowRight className="rotate-180" size={20} /> Back to Dashboard
              </button>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedCategory}</h2>
                
                {selectedCategory && (
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Backend Connection Status */}
                    <div className="flex items-center gap-2">
                      {isBackendConnected ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <AlertCircle size={16} className="text-yellow-400" />
                      )}
                      <span className="text-sm text-blue-200">
                        {isBackendConnected ? 'Backend Connected' : 'Demo Mode'}
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Target IP (optional)"
                      value={targetIp}
                      onChange={e => setTargetIp(e.target.value.trim())}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-300/50"
                      style={{ width: '160px' }}
                    />
                    <input
                      type="text"
                      placeholder="Community"
                      value={community}
                      onChange={e => setCommunity(e.target.value)}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      style={{ width: '130px' }}
                    />

                    {/* Advanced Hints */}
                    <input
                      type="text"
                      placeholder="ifIndex (e.g., 1)"
                      value={ifIndex}
                      onChange={e => setIfIndex(e.target.value)}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-300/50"
                      style={{ width: '120px' }}
                    />
                    <input
                      type="text"
                      placeholder="signal OID (optional)"
                      value={signalOid}
                      onChange={e => setSignalOid(e.target.value)}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-300/50"
                      style={{ width: '180px' }}
                    />
                    <input
                      type="text"
                      placeholder="snr OID (optional)"
                      value={snrOid}
                      onChange={e => setSnrOid(e.target.value)}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-300/50"
                      style={{ width: '170px' }}
                    />
                    <input
                      type="text"
                      placeholder="log base OID (optional)"
                      value={logBaseOid}
                      onChange={e => setLogBaseOid(e.target.value)}
                      className="px-2 py-1 rounded bg-blue-900/50 text-blue-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-blue-300/50"
                      style={{ width: '200px' }}
                    />
                    
                    {/* Refresh Button */}
                    <button
                      onClick={() => {
                        if (isDiscovering) return; // debounce guard
                        discoverByCategory(selectedCategory);
                      }}
                      disabled={isDiscovering}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition disabled:opacity-50"
                    >
                      {isDiscovering ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      {isDiscovering ? 'Discovering...' : 'Discover Devices'}
                    </button>
                  </div>
                )}
              </div>

              {/* Discovery Error */}
              {discoveryError && (
                <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-md flex items-center gap-2">
                  <AlertCircle size={16} className="text-yellow-400" />
                  <span className="text-yellow-100 text-sm">{discoveryError}</span>
                </div>
              )}

              {/* Loading State */}
              {selectedCategory === 'Station Radios' && isDiscovering && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader size={40} className="animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-blue-200">Scanning network for Station Radio devices...</p>
                  </div>
                </div>
              )}

              {/* Device Grid */}
              {!isDiscovering && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {getDeviceList(selectedCategory).map((device) => (
                    <button
                      key={device.id}
                      onClick={() => handleDeviceClick(device, selectedCategory)}
                      className="bg-gradient-to-br from-cyan-400 to-blue-400 rounded-2xl shadow-xl flex flex-col items-center justify-center py-8 px-4 transition hover:scale-105 hover:shadow-2xl relative"
                      style={{
                        minHeight: '140px',
                        background: 'linear-gradient(135deg, #1ee0ff 0%, #3b82f6 100%)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                      }}
                    >
                      {/* Device Status Indicator */}
                      {selectedCategory === 'Station Radios' && (
                        <div className="absolute top-2 right-2">
                          {device.isReal ? (
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="Real Device" />
                          ) : (
                            <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Simulation" />
                          )}
                        </div>
                      )}
                      
                      <div className="mb-3">{device.icon}</div>
                      <div className="text-white text-lg font-semibold text-center">{device.name}</div>
                      
                      {/* IP Address */}
                      {device.ip && (
                        <div className="text-blue-100 text-sm mt-1">{device.ip}</div>
                      )}
                      
                      <div className="text-blue-100 text-sm mt-1">
                        Connect
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Main Dashboard Cards
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {elements.map((el) => (
                  <button
                    key={el.name}
                    onClick={() => handleCardClick(el.name)}
                    className={`
                      group bg-gradient-to-br ${el.color}
                      rounded-2xl shadow-xl flex flex-col items-center justify-center
                      py-10 px-6 transition transform hover:scale-105 hover:shadow-2xl
                      focus:outline-none border-0
                    `}
                    style={{
                      minHeight: '180px',
                      background: 'linear-gradient(135deg, #1ee0ff 0%, #3b82f6 100%)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                    }}
                  >
                    <div className="mb-4">{el.icon}</div>
                    <div className="text-white text-xl font-semibold mb-1 drop-shadow">{el.name}</div>
                    <div className="flex items-center gap-2 text-blue-100 font-medium text-base">
                      {el.desc}
                      <ArrowRight size={18} className="ml-1 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                ))}
              </div>
              {/* ...existing code... */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;