import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Activity, FileText, RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile data
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  
  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Activities
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevel, setLogLevel] = useState('');
  const [logCategory, setLogCategory] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'activities') {
      loadActivities();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, logLevel, logCategory]);

  const loadProfile = () => {
    // Load from session storage (set during login)
    const storedEmail = sessionStorage.getItem('user_email') || 'admin@metro.com';
    const storedName = sessionStorage.getItem('user_name') || 'Metro Admin';
    const storedRole = sessionStorage.getItem('user_role') || 'customer';
    
    setEmail(storedEmail);
    setName(storedName);
    setRole(storedRole);
    setCreatedAt(new Date().toISOString());
  };

  const loadActivities = async () => {
    setActivitiesLoading(true);
    try {
      const response = await apiService.getUserActivities(50);
      setActivities(response.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await apiService.getSystemLogs(100, logLevel || null, logCategory || null);
      setLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      await apiService.changePassword(currentPassword, newPassword);
      setPasswordMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage('');
      }, 2000);
    } catch (error) {
      setPasswordError(error.response?.data?.detail || 'Failed to change password');
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Customer Dashboard</h1>
                <p className="text-gray-600">Manage your profile, view activities and system logs</p>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <User size={32} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'profile'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User size={20} />
                Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'activities'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity size={20} />
                Activities
              </div>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'logs'
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText size={20} />
                System Logs
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Mail size={16} />
                    Email Address
                  </label>
                  <div className="p-3 bg-gray-100 rounded-lg text-gray-800">
                    {email}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <User size={16} />
                    Name
                  </label>
                  <div className="p-3 bg-gray-100 rounded-lg text-gray-800">
                    {name}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Role</label>
                  <div className="p-3 bg-gray-100 rounded-lg text-gray-800 capitalize">
                    {role}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Member Since</label>
                  <div className="p-3 bg-gray-100 rounded-lg text-gray-800">
                    {formatTimestamp(createdAt)}
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Lock size={20} />
                    Security Settings
                  </h3>
                  {!showPasswordForm && (
                    <button
                      onClick={() => setShowPasswordForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {showPasswordForm && (
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    {passwordMessage && (
                      <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                        {passwordMessage}
                      </div>
                    )}
                    {passwordError && (
                      <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {passwordError}
                      </div>
                    )}

                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type={showCurrentPwd ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-3 top-9 text-gray-500"
                      >
                        {showCurrentPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type={showNewPwd ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-3 top-9 text-gray-500"
                      >
                        {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordError('');
                          setPasswordMessage('');
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Your Activities</h2>
                <button
                  onClick={loadActivities}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  disabled={activitiesLoading}
                >
                  <RefreshCw size={16} className={activitiesLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {activitiesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading activities...</div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No activities found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Timestamp</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((activity, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatTimestamp(activity.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                            {activity.action}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {activity.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {activity.device_ip ? `${activity.device_type} (${activity.device_ip})` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">System Logs</h2>
                <button
                  onClick={loadLogs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  disabled={logsLoading}
                >
                  <RefreshCw size={16} className={logsLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="ERROR">ERROR</option>
                </select>

                <select
                  value={logCategory}
                  onChange={(e) => setLogCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="AUTH">AUTH</option>
                  <option value="DEVICE">DEVICE</option>
                  <option value="CONFIG">CONFIG</option>
                  <option value="SECURITY">SECURITY</option>
                </select>
              </div>

              {logsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No logs found</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(log.level)}`}>
                              {log.level}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-700">
                              {log.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 font-medium">{log.message}</div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
