import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import DeviceManagement from './components/DeviceManagement';

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
          path="/device/:type/:id"
          element={isAuthenticated() ? <DeviceManagement /> : <Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;