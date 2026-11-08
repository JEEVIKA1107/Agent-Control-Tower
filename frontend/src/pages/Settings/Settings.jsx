import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Radio,
  Server,
  ShieldAlert,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import './Settings.css';

const Settings = () => {
  const { user, isAdmin } = useAuth();

  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/demo/status');
      if (res.data.success) {
        setSystemStatus(res.data.data);
      }
    } catch (err) {
      console.error('[Settings] Failed to fetch system breakdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReset = async () => {
    if (!isAdmin) return;
    try {
      setResetting(true);
      const res = await api.post('/demo/reset');
      if (res.data.success) {
        setResetMessage(res.data.message);
        setConfirmOpen(false);
        fetchStatus();
      }
    } catch (err) {
      alert(`Reset failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System & Runtime Settings</h1>
            <span className="badge badge-live">Operational</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Runtime parameters, cost estimation rate, storage source partitioning, and demo state reset
          </p>
        </div>
      </div>

      {resetMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--accent-emerald)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--accent-emerald)',
          fontSize: '0.85rem'
        }}>
          <CheckCircle size={18} />
          <span>{resetMessage}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Environment & Backend Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Server size={20} color="var(--accent-cyan)" />
            <h3>Runtime Environment</h3>
          </div>

          <div className="settings-field-group">
            <span className="settings-label">Application Node Environment</span>
            <div className="settings-value">development / Windows win32</div>
          </div>

          <div className="settings-field-group">
            <span className="settings-label">Database Connection URI</span>
            <div className="settings-value">mongodb://127.0.0.1:27017/agent_control_tower</div>
          </div>

          <div className="settings-field-group">
            <span className="settings-label">Real-Time WebSocket Transport</span>
            <div className="settings-value">Socket.IO (polling / websocket)</div>
          </div>
        </div>

        {/* Cost & Token Pricing Model Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <DollarSign size={20} color="var(--accent-emerald)" />
            <h3>Token Pricing Model</h3>
          </div>

          <div className="settings-field-group">
            <span className="settings-label">Configured Cost per 1K Tokens</span>
            <div className="settings-value">$0.002000 USD / 1,000 tokens</div>
          </div>

          <div className="settings-field-group">
            <span className="settings-label">Calculation Mode</span>
            <div className="settings-value">Estimated (Explicitly labelled across all metrics)</div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)'
          }}>
            <Info size={14} style={{ display: 'inline', marginRight: '0.4rem', color: 'var(--accent-cyan)' }} />
            All financial totals in the dashboard are derived dynamically using{' '}
            <code>(totalTokens / 1000) * costPer1kTokens</code> and presented as estimated cost.
          </div>
        </div>

        {/* Storage Partitioning (Live vs Simulated) */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Database size={20} color="var(--accent-blue)" />
            <h3>Storage Partitioning (Live vs Simulated)</h3>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Every collection enforces explicit source tagging to prevent synthetic demo telemetry from contaminating production records.
          </p>

          <table className="storage-breakdown-table">
            <thead>
              <tr>
                <th>Collection</th>
                <th>Live Records</th>
                <th>Simulated Records</th>
              </tr>
            </thead>
            <tbody>
              {systemStatus ? (
                <>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Agents</td>
                    <td><span className="badge badge-live">{systemStatus.agents.live}</span></td>
                    <td><span className="badge badge-amber">{systemStatus.agents.simulated}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Telemetry Spans</td>
                    <td><span className="badge badge-live">{systemStatus.telemetry.live}</span></td>
                    <td><span className="badge badge-amber">{systemStatus.telemetry.simulated}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Anomalies</td>
                    <td><span className="badge badge-live">{systemStatus.anomalies.live}</span></td>
                    <td><span className="badge badge-amber">{systemStatus.anomalies.simulated}</span></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Audit Ledger</td>
                    <td><span className="badge badge-live">{systemStatus.auditLogs.live}</span></td>
                    <td><span className="badge badge-amber">{systemStatus.auditLogs.simulated}</span></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading partition breakdown...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Safe Demo Reset (Admin Zone) */}
        <div className="settings-card danger-zone">
          <div className="settings-card-header">
            <ShieldAlert size={20} color="var(--accent-rose)" />
            <h3 style={{ color: 'var(--accent-rose)' }}>Safe Demo State Management</h3>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Restores initial genesis baseline data (sample agents, baseline traces, policy rules, and audit logs).
            <br />
            <strong>Safety Guarantee:</strong> This action strictly filters by <code>source: "simulated"</code>. Any genuine live telemetry or custom registered agents are preserved.
          </p>

          {!isAdmin && (
            <span className="badge badge-viewer">Admin role required to trigger demo reset</span>
          )}

          {confirmOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                Are you sure? This will reset all simulated demo data to initial genesis state.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleReset}
                  disabled={resetting || !isAdmin}
                  style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', fontSize: '0.8rem' }}
                >
                  {resetting ? 'Resetting...' : 'Yes, Reset Demo Baseline'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  style={{ fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmOpen(true)}
              disabled={!isAdmin}
              style={{
                borderColor: 'var(--accent-rose)',
                color: 'var(--accent-rose)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                alignSelf: 'flex-start'
              }}
            >
              <RotateCcw size={14} />
              Reset Simulated Demo Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
