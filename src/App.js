import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import DeviceManagement from './components/DeviceManagement';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/device/:type/:id" element={<DeviceManagement />} />
      </Routes>
    </Router>
  );
}

export default App;