import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  Bot,
  Plus,
  Search,
  Filter,
  Power,
  Trash2,
  Edit,
  Eye,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import './Agents.css';

const Agents = () => {
  const { isOperator } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentDetails, setAgentDetails] = useState(null);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [registerForm, setRegisterForm] = useState({
    agentId: '',
    name: '',
    type: 'Monitoring',
    framework: 'LangGraph',
    description: '',
    source: 'live'
  });
  const [formError, setFormError] = useState('');

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await api.get('/agents', { params });
      if (res.data.success) {
        setAgents(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load agents from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [statusFilter, typeFilter, sourceFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAgents();
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await api.post('/agents', registerForm);
      if (res.data.success) {
        setIsRegisterOpen(false);
        setRegisterForm({
          agentId: '',
          name: '',
          type: 'Monitoring',
          framework: 'LangGraph',
          description: '',
          source: 'live'
        });
        fetchAgents();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to register agent');
    }
  };

  const handleToggleStatus = async (agent) => {
    try {
      await api.put(`/agents/${agent.agentId}/toggle-status`);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle agent status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    try {
      await api.delete(`/agents/${agentToDelete.agentId}`);
      setAgentToDelete(null);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete agent');
    }
  };

  const handleViewDetails = async (agent) => {
    try {
      setSelectedAgent(agent);
      const res = await api.get(`/agents/${agent.agentId}`);
      if (res.data.success) {
        setAgentDetails(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load agent details', err);
    }
  };

  return (
    <div className="agents-page">
      {/* Page Header */}
      <div className="agents-header">
        <div className="agents-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Agent Management</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Register, inspect execution lineage, toggle status and govern autonomous agents</p>
        </div>

        {isOperator && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            <span>Register Agent</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="agents-controls">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search by name, ID or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
            <Search size={16} />
          </button>
        </form>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Status: All</option>
          <option value="Active">Active</option>
          <option value="Idle">Idle</option>
          <option value="Failed">Failed</option>
          <option value="Disabled">Disabled</option>
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Type: All</option>
          <option value="Monitoring">Monitoring</option>
          <option value="Token Management">Token Management</option>
          <option value="Failure Detection">Failure Detection</option>
          <option value="Governance">Governance</option>
          <option value="Model Routing">Model Routing</option>
          <option value="Orchestration">Orchestration</option>
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">Source: All</option>
          <option value="simulated">Simulated Only</option>
          <option value="live">Live Only</option>
        </select>

        <button onClick={fetchAgents} className="icon-btn" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Main Table Content */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <RefreshCw size={24} className="spin" />
            <span>Loading agents from database...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <AlertCircle size={28} color="var(--status-danger)" />
            <span>{error}</span>
            <button onClick={fetchAgents} className="btn-secondary" style={{ marginTop: '0.5rem' }}>Retry</button>
          </div>
        ) : agents.length === 0 ? (
          <div className="empty-container">
            <Bot size={36} color="var(--text-muted)" />
            <p>No agents match the selected query or filter criteria.</p>
          </div>
        ) : (
          <table className="agents-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Framework</th>
                <th>Status</th>
                <th>Executions</th>
                <th>Tokens</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{agent.name}</div>
                    <span className="agent-id-pill">{agent.agentId}</span>
                  </td>
                  <td>{agent.type}</td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)' }}>{agent.framework}</span>
                  </td>
                  <td>
                    <span className={`status-badge status-${agent.status}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{agent.executionCount.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{agent.totalTokens.toLocaleString()}</td>
                  <td>
                    <SimulatedBadge source={agent.source} />
                  </td>
                  <td>
                    <div className="action-btn-group">
                      <button
                        onClick={() => handleViewDetails(agent)}
                        className="icon-btn"
                        title="View Execution History"
                      >
                        <Eye size={15} />
                      </button>

                      {isOperator && (
                        <>
                          <button
                            onClick={() => handleToggleStatus(agent)}
                            className="icon-btn"
                            title={agent.status === 'Active' ? 'Deactivate Agent' : 'Activate Agent'}
                          >
                            <Power size={15} color={agent.status === 'Active' ? 'var(--status-active)' : 'var(--text-muted)'} />
                          </button>

                          <button
                            onClick={() => setAgentToDelete(agent)}
                            className="icon-btn delete"
                            title="Delete Agent"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Register Autonomous Agent</h2>
              <button onClick={() => setIsRegisterOpen(false)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div style={{ background: 'var(--status-danger-bg)', color: '#fca5a5', padding: '0.6rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Unique Agent ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="agent-sentinel-01"
                  value={registerForm.agentId}
                  onChange={(e) => setRegisterForm({ ...registerForm, agentId: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sentinel Anomaly Observer"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Agent Type *
                  </label>
                  <select
                    value={registerForm.type}
                    onChange={(e) => setRegisterForm({ ...registerForm, type: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="Monitoring">Monitoring</option>
                    <option value="Token Management">Token Management</option>
                    <option value="Failure Detection">Failure Detection</option>
                    <option value="Governance">Governance</option>
                    <option value="Model Routing">Model Routing</option>
                    <option value="Orchestration">Orchestration</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    Framework
                  </label>
                  <select
                    value={registerForm.framework}
                    onChange={(e) => setRegisterForm({ ...registerForm, framework: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="LangGraph">LangGraph</option>
                    <option value="AutoGen">AutoGen</option>
                    <option value="CrewAI">CrewAI</option>
                    <option value="Custom">Custom</option>
                    <option value="OpenAI Swarm">OpenAI Swarm</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Source Tag
                </label>
                <select
                  value={registerForm.source}
                  onChange={(e) => setRegisterForm({ ...registerForm, source: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="live">Live (Production)</option>
                  <option value="simulated">Simulated (Demo Sandbox)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Operational responsibilities, expected models and runtime limits..."
                  value={registerForm.description}
                  onChange={(e) => setRegisterForm({ ...registerForm, description: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsRegisterOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {agentToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--status-danger)' }}>
              Confirm Agent Removal
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete agent <strong style={{ color: 'var(--text-primary)' }}>{agentToDelete.name}</strong> ({agentToDelete.agentId})?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button onClick={() => setAgentToDelete(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="btn-danger">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedAgent.name}</h2>
                <span className="agent-id-pill">{selectedAgent.agentId}</span>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Type</div>
                <div style={{ fontWeight: 600 }}>{selectedAgent.type}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 600 }}>{selectedAgent.status}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Source</div>
                <SimulatedBadge source={selectedAgent.source} />
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--accent-cyan)' }}>
              Recent Execution Spans
            </h4>
            {agentDetails?.recentExecutions?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {agentDetails.recentExecutions.map((exec) => (
                  <div
                    key={exec._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{exec.traceId}</span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(exec.startTime).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge status-${exec.status === 'success' ? 'Active' : 'Failed'}`}>
                        {exec.status}
                      </span>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                        {exec.duration} ms | {exec.tokens?.total || 0} tokens
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No recent executions recorded yet.</p>
            )}

            <div className="modal-actions">
              <button onClick={() => setSelectedAgent(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
