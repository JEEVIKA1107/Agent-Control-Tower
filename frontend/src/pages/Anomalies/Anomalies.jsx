import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  AlertTriangle,
  Play,
  CheckCircle,
  Eye,
  RefreshCw,
  X,
  Code,
  Sparkles,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import './Anomalies.css';

const Anomalies = () => {
  const { isOperator } = useAuth();
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanMessage, setScanMessage] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modal inspection
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (typeFilter !== 'all') params.type = typeFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;

      const res = await api.get('/anomalies', { params });
      if (res.data.success) {
        setAnomalies(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [typeFilter, severityFilter, statusFilter, sourceFilter]);

  const handleRunDetection = async () => {
    try {
      setScanning(true);
      setScanMessage('');
      const res = await api.post('/anomalies/detect');
      if (res.data.success) {
        setScanMessage(res.data.message);
        fetchAnomalies();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute anomaly detection scan');
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.put(`/anomalies/${id}/acknowledge`);
      fetchAnomalies();
      if (selectedAnomaly && (selectedAnomaly._id === id || selectedAnomaly.anomalyId === id)) {
        setSelectedAnomaly(prev => ({ ...prev, status: 'Acknowledged' }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge anomaly');
    }
  };

  const plannedMLEnhancements = [
    {
      name: 'Markov-Based Failure-Risk Forecasting',
      description: 'Predictive probabilistic state transition modeling estimating agent execution failure probability prior to span dispatch.'
    },
    {
      name: 'Contrastive Trace-Based Anomaly Detection',
      description: 'Latent vector contrastive embedding comparing live agent call graphs against baseline golden execution topologies.'
    },
    {
      name: 'Time-Series Resource Forecasting',
      description: 'Long short-term memory (LSTM) resource forecasting for predicting token burst exhaustion windows across concurrent clusters.'
    },
    {
      name: 'Context Degradation Analysis',
      description: 'Attention dissipation scoring detecting token hallucination thresholds over expansive conversational history.'
    },
    {
      name: 'Dependency Error Cascade Analysis',
      description: 'Genealogy-graph root-cause inference attributing multi-agent failures across asynchronous parent-child spans.'
    }
  ];

  return (
    <div className="anomalies-page">
      {/* Page Header */}
      <div className="anomalies-header">
        <div className="anomalies-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Rule-Based Anomaly Detection</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Deterministic governance triggers: recursion loops, token surges, latency limits, silent failures & prompt drift</p>
        </div>

        {isOperator && (
          <button
            onClick={handleRunDetection}
            disabled={scanning}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={16} />
            <span>{scanning ? 'Evaluating Rules...' : 'Scan Telemetry for Anomalies'}</span>
          </button>
        )}
      </div>

      {scanMessage && (
        <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', color: '#38bdf8' }}>
          {scanMessage}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="agents-controls">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Condition: All Rules</option>
          <option value="repeated_execution">Repeated Execution / Loop</option>
          <option value="token_surge">Token Surge</option>
          <option value="high_latency">High Latency</option>
          <option value="silent_failure">Silent Failure / Timeout</option>
          <option value="prompt_drift">Prompt Drift</option>
        </select>

        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">Severity: All</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Status: All</option>
          <option value="New">New (Active)</option>
          <option value="Acknowledged">Acknowledged</option>
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">Source: All</option>
          <option value="simulated">Simulated Only</option>
          <option value="live">Live Only</option>
        </select>

        <button onClick={fetchAnomalies} className="icon-btn" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Anomalies Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <RefreshCw size={24} className="spin" />
            <span>Scanning anomaly ledger...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <AlertTriangle size={28} color="var(--status-danger)" />
            <span>{error}</span>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="empty-container">
            <CheckCircle size={36} color="var(--status-active)" />
            <p>No anomalous patterns detected. All execution spans within policy bounds.</p>
          </div>
        ) : (
          <table className="agents-table">
            <thead>
              <tr>
                <th>Detection Time</th>
                <th>Anomaly Type</th>
                <th>Severity</th>
                <th>Target Agent</th>
                <th>Description</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((anom) => (
                <tr key={anom._id}>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(anom.detectionTime).toLocaleString()}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {anom.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-badge severity-${anom.severity}`}>
                      {anom.severity}
                    </span>
                  </td>
                  <td>
                    <span className="agent-id-pill">{anom.agentId}</span>
                  </td>
                  <td style={{ maxWidth: '300px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {anom.description}
                  </td>
                  <td>
                    <span className={`status-badge status-${anom.status === 'New' ? 'Failed' : 'Active'}`}>
                      {anom.status}
                    </span>
                  </td>
                  <td>
                    <SimulatedBadge source={anom.source} />
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button
                        onClick={() => setSelectedAnomaly(anom)}
                        className="icon-btn"
                        title="View Rule Evidence"
                      >
                        <Eye size={15} />
                      </button>

                      {isOperator && anom.status === 'New' && (
                        <button
                          onClick={() => handleAcknowledge(anom.anomalyId)}
                          className="btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                          title="Acknowledge Alert"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Planned ML Panel (Strictly Labeled as Unvalidated Planned Enhancement) */}
      <div className="planned-ml-panel">
        <div className="planned-ml-header">
          <div className="planned-ml-title">
            <Sparkles size={18} color="var(--accent-violet)" />
            <span>Planned Enhancements – Machine Learning Forecasting (Not Yet Implemented / Validated)</span>
          </div>
          <span className="badge badge-viewer">Roadmap</span>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Notice: Machine learning and probabilistic models are strictly roadmap items and are NOT active in runtime evaluation. Current anomaly detection is 100% deterministic rule-based.
        </p>

        <div className="planned-card-grid">
          {plannedMLEnhancements.map((m, idx) => (
            <div key={idx} className="planned-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="planned-card-name">{m.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Planned</span>
              </div>
              <p className="planned-card-desc">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Evidence Modal */}
      {selectedAnomaly && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Anomaly Trigger Evidence</span>
                  <span className={`severity-badge severity-${selectedAnomaly.severity}`}>
                    {selectedAnomaly.severity}
                  </span>
                </h2>
                <span className="agent-id-pill">ID: {selectedAnomaly.anomalyId}</span>
              </div>
              <button onClick={() => setSelectedAnomaly(null)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Description</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                {selectedAnomaly.description}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Agent</span>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedAnomaly.agentId}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trace ID</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{selectedAnomaly.traceId}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Recommended Action</span>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>
                  {selectedAnomaly.recommendedAction}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <Code size={14} />
                <span>Deterministic Trigger Evidence Payload</span>
              </div>
              <div className="json-viewer">
                {JSON.stringify(selectedAnomaly.evidence, null, 2)}
              </div>
            </div>

            <div className="modal-actions">
              {isOperator && selectedAnomaly.status === 'New' && (
                <button
                  onClick={() => handleAcknowledge(selectedAnomaly.anomalyId)}
                  className="btn-primary"
                >
                  Acknowledge Anomaly
                </button>
              )}
              <button onClick={() => setSelectedAnomaly(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Anomalies;
