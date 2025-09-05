import React, { useState } from 'react';
import { Shield, Key, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {

  const [licenseKey, setLicenseKey] = useState('');
  const navigate = useNavigate();
  const demoKey = "METRO-2025-EMS1-ACT1";
  const [copied, setCopied] = useState(false);

  // Simulated license key to username mapping
  const licenseKeyToUsername = {
    "METRO-2025-EMS1-ACT1": "MetroAdmin",
    // Add more mappings as needed
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const username = licenseKeyToUsername[licenseKey];
    if (username) {
      navigate('/dashboard', { state: { username } });
    } else {
      alert('Invalid license key!');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(demoKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl px-8 py-10 w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full shadow-lg">
            <Shield className="text-white w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">MetroEMS</h1>
        <div className="text-blue-100 mb-8">Metro Element Management System</div>
        <form className="w-full space-y-5" onSubmit={handleSubmit}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
              <Key size={18} />
            </span>
            <input
              type="text"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="Enter your license key"
              className="w-full pl-10 pr-3 py-3 rounded-md border-none bg-blue-900/60 text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold tracking-wider"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-md font-semibold hover:bg-blue-800 transition shadow"
          >
            <CheckCircle size={20} className="inline" />
            Activate License
          </button>
        </form>
        <div className="mt-8 w-full">
          <div className="bg-blue-800/80 border border-blue-600 rounded-md py-2 px-4 text-blue-100 font-semibold text-sm flex flex-col items-center">
            <span>Demo License:</span>
            <button
              className="font-bold tracking-wider text-blue-200 bg-blue-700/60 px-3 py-1 rounded mt-1 hover:bg-blue-700 transition cursor-pointer select-all"
              onClick={handleCopy}
              type="button"
              title="Click to copy"
            >
              {demoKey}
            </button>
            <span className="text-xs text-blue-300 mt-1">{copied ? "Copied!" : "Click to copy"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;