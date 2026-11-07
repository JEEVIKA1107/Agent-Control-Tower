import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  ShieldCheck,
  Save,
  CheckCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import './Governance.css';

const Governance = () => {
  const { isAdmin } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchGovernanceData = async () => {
    try {
      setLoading(true);
      const [polRes, recRes] = await Promise.all([
        api.get('/governance/policies'),
        api.get('/governance/recommendations')
      ]);

      if (polRes.data.success && polRes.data.data.length > 0) {
        setPolicy(polRes.data.data[0]);
      }
      if (recRes.data.success) {
        setRecommendations(recRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load governance data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const handlePolicySave = async (e) => {
    e.preventDefault();
    if (!policy) return;

    try {
      setSaving(true);
      setStatusMessage('');
      const res = await api.put(`/governance/policies/${policy.policyId}`, policy);
      if (res.data.success) {
        setPolicy(res.data.data);
        setStatusMessage('Governance policy thresholds updated successfully.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="governance-page">
      {/* Header */}
      <div className="governance-header">
        <div className="governance-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Governance Centre</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Configure operational boundary policies and inspect automated risk mitigation recommendations</p>
        </div>

        <button onClick={fetchGovernanceData} className="icon-btn" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {statusMessage && (
        <div style={{ background: 'var(--status-active-bg)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', color: '#6ee7b7' }}>
          {statusMessage}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <RefreshCw size={24} className="spin" />
          <span>Loading governance policies...</span>
        </div>
      ) : (
        <div className="governance-grid">
          {/* Policy Configuration Form */}
          <div className="policy-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Operational Policy Thresholds</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isAdmin ? 'Active Administrator Configuration' : 'Read-Only Policy View'}
                </span>
              </div>
              <span className="badge badge-simulated">{policy?.policyId}</span>
            </div>

            <form onSubmit={handlePolicySave}>
              <div className="policy-form-grid">
                <div>
                  <label className="form-label">Max Token Budget (Ceiling)</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={policy?.maxTokenBudget || ''}
                    onChange={(e) => setPolicy({ ...policy, maxTokenBudget: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tokens per span</span>
                </div>

                <div>
                  <label className="form-label">Max Execution Duration</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={policy?.maxExecutionDurationMs || ''}
                    onChange={(e) => setPolicy({ ...policy, maxExecutionDurationMs: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Milliseconds ceiling</span>
                </div>

                <div>
                  <label className="form-label">Recursion Loop Limit</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={policy?.maxRepeatedCalls || ''}
                    onChange={(e) => setPolicy({ ...policy, maxRepeatedCalls: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Identical call signatures</span>
                </div>

                <div>
                  <label className="form-label">Prompt Drift Threshold</label>
                  <input
                    type="number"
                    step="0.05"
                    disabled={!isAdmin}
                    value={policy?.promptDriftThreshold !== undefined ? policy.promptDriftThreshold : 0.65}
                    onChange={(e) => setPolicy({ ...policy, promptDriftThreshold: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cosine similarity floor (0-1)</span>
                </div>

                <div>
                  <label className="form-label">Heartbeat Timeout</label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={policy?.heartbeatTimeoutMs || ''}
                    onChange={(e) => setPolicy({ ...policy, heartbeatTimeoutMs: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Silent failure ceiling</span>
                </div>

                <div>
                  <label className="form-label">Estimated Rate / 1K Tokens</label>
                  <input
                    type="number"
                    step="0.0005"
                    disabled={!isAdmin}
                    value={policy?.costPer1kTokens !== undefined ? policy.costPer1kTokens : 0.002}
                    onChange={(e) => setPolicy({ ...policy, costPer1kTokens: Number(e.target.value) })}
                    style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cost calculation rate</span>
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={16} />
                    <span>{saving ? 'Updating...' : 'Save Policy Thresholds'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Governance Recommendations Feed */}
          <div className="policy-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>System Recommendations</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Generated from anomaly evaluations
                </span>
              </div>
              <span className="badge badge-simulated">{recommendations.length} Active</span>
            </div>

            {recommendations.length === 0 ? (
              <div className="empty-container">
                <CheckCircle size={32} color="var(--status-active)" />
                <p>No active recommendations pending. System running within boundary policies.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
                {recommendations.map((rec) => (
                  <div
                    key={rec._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`action-pill action-${rec.actionType}`}>
                        {rec.actionType.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Agent: {rec.agentId}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {rec.reason}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                      <span>Linked Anomaly: {rec.anomalyId}</span>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: rec.status === 'active' ? 'var(--status-warning)' : 'var(--status-active)' }}>
                        Status: {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Governance;
