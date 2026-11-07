import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Agents from './pages/Agents/Agents';
import Lineage from './pages/Lineage/Lineage';
import Telemetry from './pages/Telemetry/Telemetry';
import Anomalies from './pages/Anomalies/Anomalies';
import Governance from './pages/Governance/Governance';
import Orchestration from './pages/Orchestration/Orchestration';
import Approvals from './pages/Approvals/Approvals';
import Audit from './pages/Audit/Audit';
import Integrations from './pages/Integrations/Integrations';
import Settings from './pages/Settings/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Application Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="lineage" element={<Lineage />} />
            <Route path="telemetry" element={<Telemetry />} />
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="governance" element={<Governance />} />
            <Route path="orchestration" element={<Orchestration />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="audit" element={<Audit />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
