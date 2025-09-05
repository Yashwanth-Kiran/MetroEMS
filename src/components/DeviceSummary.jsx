import React from 'react';

const DeviceSummary = () => {
  // Example static device summary data
  const device = {
    name: 'Station Device 1',
    type: 'Station Radio',
    status: 'Online',
    ip: '192.168.1.10',
    location: 'Central Station',
    lastChecked: '2025-08-28 10:30 AM',
    description: 'This device monitors radio signals at the central station and reports status to MetroEMS.'
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 mt-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Device Summary</h2>
      <div className="text-blue-100 mb-2"><strong>Name:</strong> {device.name}</div>
      <div className="text-blue-100 mb-2"><strong>Type:</strong> {device.type}</div>
      <div className="text-blue-100 mb-2"><strong>Status:</strong> {device.status}</div>
      <div className="text-blue-100 mb-2"><strong>IP Address:</strong> {device.ip}</div>
      <div className="text-blue-100 mb-2"><strong>Location:</strong> {device.location}</div>
      <div className="text-blue-100 mb-2"><strong>Last Checked:</strong> {device.lastChecked}</div>
      <div className="text-blue-100 mb-2"><strong>Description:</strong> {device.description}</div>
    </div>
  );
};

export default DeviceSummary;
