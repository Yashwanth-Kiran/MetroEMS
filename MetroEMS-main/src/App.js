import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import DeviceManagement from './components/DeviceManagement';
import TranscoderDetail from './components/TranscoderDetail';
import EncoderDetail from './components/EncoderDetail';
import OBCDetail from './components/OBCDetail';
import CustomerDashboard from './pages/CustomerDashboard';

// Authentication check: backend token or demo mode flag
const isAuthenticated = () => {
  return !!localStorage.getItem('metroems_token') || sessionStorage.getItem('demo_auth') === 'true';
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route
          path="/customer-dashboard"
          element={isAuthenticated() ? <CustomerDashboard /> : <Navigate to="/" replace />} />
        <Route
          path="/device/:type/:id"
          element={isAuthenticated() ? <DeviceManagement /> : <Navigate to="/" replace />} />
        <Route
          path="/transcoder/:id"
          element={isAuthenticated() ? <TranscoderDetail /> : <Navigate to="/" replace />} />
        <Route
          path="/encoder/:id"
          element={isAuthenticated() ? <EncoderDetail /> : <Navigate to="/" replace />} />
        <Route
          path="/obc/:id"
          element={isAuthenticated() ? <OBCDetail /> : <Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;