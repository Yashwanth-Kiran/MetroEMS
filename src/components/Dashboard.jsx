import React, { useState } from 'react';
import DeviceSummary from './DeviceSummary';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Cpu as CpuChip,
  Box
} from 'lucide-react';

const deviceLists = {
  'Station Radios': [
    { id: 1, name: 'Station Device 1', icon: <Wifi size={32} className="text-cyan-300" /> },
    { id: 2, name: 'Station Device 2', icon: <Wifi size={32} className="text-cyan-300" /> },
    { id: 3, name: 'Station Device 3', icon: <Wifi size={32} className="text-cyan-300" /> },
  ],
  'Train Radios': [
    { id: 1, name: 'Train Device 1', icon: <MonitorSmartphone size={32} className="text-cyan-300" /> },
    { id: 2, name: 'Train Device 2', icon: <MonitorSmartphone size={32} className="text-cyan-300" /> },
  ],
  'Transcoder': [
    { id: 1, name: 'Transcoder Device 1', icon: <Tv size={32} className="text-cyan-300" /> },
    { id: 2, name: 'Transcoder Device 2', icon: <Tv size={32} className="text-cyan-300" /> },
  ],
  'Encoder': [
    { id: 1, name: 'Encoder Device 1', icon: <Camera size={32} className="text-cyan-300" /> },
    { id: 2, name: 'Encoder Device 2', icon: <Camera size={32} className="text-cyan-300" /> },
  ],
  'OBC': [
    { id: 1, name: 'OBC Device 1', icon: <CpuChip size={32} className="text-cyan-300" /> },
    { id: 2, name: 'OBC Device 2', icon: <CpuChip size={32} className="text-cyan-300" /> },
  ],
  'IO Box Controller': [
    { id: 1, name: 'IO Box Device 1', icon: <Box size={32} className="text-cyan-300" /> },
    { id: 2, name: 'IO Box Device 2', icon: <Box size={32} className="text-cyan-300" /> },
  ],
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
  const navigate = useNavigate();
  const location = useLocation();
  const username = location.state && location.state.username ? location.state.username : '';

  const handleCardClick = (name) => {
    setSelectedCategory(name);
  };

  const handleDeviceClick = (device, category) => {
    navigate(`/device/${encodeURIComponent(category)}/${device.id}`);
  };

  const handleBack = () => setSelectedCategory(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="w-full max-w-5xl mx-auto flex">
        {/* Left side welcome message */}
        <div className="flex flex-col items-start justify-start mr-8 min-w-[200px]">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg px-6 py-4 mt-8">
            <span className="text-lg text-white font-semibold">{username ? `Welcome, ${username}` : "Welcome"}</span>
          </div>
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
              <h2 className="text-2xl font-bold text-white mb-6 text-center">{selectedCategory}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {deviceLists[selectedCategory].map((device) => (
                  <button
                    key={device.id}
                    onClick={() => handleDeviceClick(device, selectedCategory)}
                    className="bg-gradient-to-br from-cyan-400 to-blue-400 rounded-2xl shadow-xl flex flex-col items-center justify-center py-8 px-4 transition hover:scale-105 hover:shadow-2xl"
                    style={{
                      minHeight: '140px',
                      background: 'linear-gradient(135deg, #1ee0ff 0%, #3b82f6 100%)',
                      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                    }}
                  >
                    <div className="mb-3">{device.icon}</div>
                    <div className="text-white text-lg font-semibold">{device.name}</div>
                    <div className="text-blue-100 text-sm mt-1">Manage Device</div>
                  </button>
                ))}
              </div>
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