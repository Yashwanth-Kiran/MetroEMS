import React, { useState } from 'react';
import { Shield, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const demoEmail = "admin@metro.com";
  const demoPassword = "admin123";
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if backend is available
      const isBackendAvailable = await apiService.isBackendAvailable();
      
      if (isBackendAvailable) {
        try {
          // Login with email and password
          const response = await apiService.loginWithEmailPassword(email, password);
          
          // Store token
          sessionStorage.setItem('auth_token', response.token);
          sessionStorage.setItem('user_email', response.user.email);
          sessionStorage.setItem('user_name', response.user.name);
          sessionStorage.setItem('user_role', response.user.role);
          
          navigate('/dashboard', {
            state: {
              username: response.user.name,
              email: response.user.email,
              role: response.user.role,
              fromBackend: true
            }
          });
        } catch (e1) {
          setError(e1.response?.data?.detail || 'Invalid email or password. Use demo credentials below.');
        }
      } else {
        // Fallback to demo mode
        if (email === demoEmail && password === demoPassword) {
          sessionStorage.setItem('demo_auth', 'true');
          navigate('/dashboard', { 
            state: { 
              username: 'Metro Admin',
              email: demoEmail,
              fromBackend: false
            } 
          });
        } else {
          setError('Invalid credentials! Use demo email and password below.');
        }
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(demoEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(demoPassword);
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

        {/* Email/Password Login Form */}
        <form className="w-full space-y-5" onSubmit={handleLogin}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
              <Mail size={18} />
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full pl-10 pr-3 py-3 rounded-md border-none bg-blue-900/60 text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
              <Lock size={18} />
            </span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-10 pr-3 py-3 rounded-md border-none bg-blue-900/60 text-blue-100 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={isLoading}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-md font-semibold hover:bg-blue-800 transition shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <CheckCircle size={20} className="inline" />
            )}
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Demo Credentials Info */}
        <div className="mt-8 w-full">
          <div className="bg-blue-800/80 border border-blue-600 rounded-md py-3 px-4 text-blue-100 text-sm">
            <div className="font-semibold text-center mb-2">Demo Credentials:</div>
            
            <div className="space-y-2">
              <div>
                <div className="text-xs text-blue-300 mb-1">Email:</div>
                <button
                  className="w-full font-mono text-blue-200 bg-blue-700/60 px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer text-left"
                  onClick={handleCopyEmail}
                  type="button"
                  title="Click to copy"
                >
                  {demoEmail}
                </button>
              </div>
              
              <div>
                <div className="text-xs text-blue-300 mb-1">Password:</div>
                <button
                  className="w-full font-mono text-blue-200 bg-blue-700/60 px-3 py-1.5 rounded hover:bg-blue-700 transition cursor-pointer text-left"
                  onClick={handleCopyPassword}
                  type="button"
                  title="Click to copy"
                >
                  {demoPassword}
                </button>
              </div>
            </div>
            
            <div className="text-xs text-blue-300 mt-2 text-center">
              {copied ? "✓ Copied!" : "Click to copy"}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;