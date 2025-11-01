import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const LoginPage = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const demoKey = "METRO-2025-EMS1-ACT1";
  const [copied, setCopied] = useState(false);

  // Check backend connectivity on component mount
  React.useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    const isAvailable = await apiService.isBackendAvailable();
    if (!isAvailable) {
      setError('Backend server is not available. Using demo mode.');
    }
  };

  // Simulated license key to username mapping (fallback for demo mode)
  const licenseKeyToUsername = {
    "METRO-2025-EMS1-ACT1": "MetroAdmin",
  };

  const handleLicenseSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if backend is available
      const isBackendAvailable = await apiService.isBackendAvailable();
      
      if (isBackendAvailable) {
        // Authenticate with backend using internal mapping; user only enters activation code
        const defaultUsername = licenseKeyToUsername[licenseKey] || 'MetroAdmin';
        const defaultPassword = 'admin123';
        try {
          const response = await apiService.login(defaultUsername, defaultPassword);
          navigate('/dashboard', {
            state: {
              username: response.username,
              role: response.role,
              org: response.org,
              fromBackend: true
            }
          });
        } catch (authError) {
          setError('Invalid activation code or backend authentication failed');
        }
      } else {
        // Fallback to demo mode
        const username = licenseKeyToUsername[licenseKey];
        if (username) {
          // mark demo mode authenticated
          sessionStorage.setItem('demo_auth', 'true');
          navigate('/dashboard', { 
            state: { 
              username,
              fromBackend: false
            } 
          });
        } else {
          setError('Invalid license key!');
        }
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
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
        
        {error && (
          <div className="w-full mb-4 p-3 bg-red-500/20 border border-red-500 rounded-md flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-100 text-sm">{error}</span>
          </div>
        )}

        {/* Activation Code Form (License key only) */}
          <form className="w-full space-y-5" onSubmit={handleLicenseSubmit}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
                <Key size={18} />
              </span>
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder="Enter your activation code"
                className="w-full pl-10 pr-3 py-3 rounded-md border-none bg-blue-900/60 text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold tracking-wider"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !licenseKey.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-md font-semibold hover:bg-blue-800 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <CheckCircle size={20} className="inline" />
              )}
              {isLoading ? 'Activating...' : 'Activate'}
            </button>
          </form>


        {/* Demo Activation Code Info */}
          <div className="mt-8 w-full">
            <div className="bg-blue-800/80 border border-blue-600 rounded-md py-2 px-4 text-blue-100 font-semibold text-sm flex flex-col items-center">
              <span>Demo Activation Code:</span>
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