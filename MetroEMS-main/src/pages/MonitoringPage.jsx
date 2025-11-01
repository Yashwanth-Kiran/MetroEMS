import React from 'react';
import DeviceSummary from '../components/DeviceSummary';

const MonitoringPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <div className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Device Monitoring</h1>
        <DeviceSummary />
      </div>
    </div>
  );
};

export default MonitoringPage;
