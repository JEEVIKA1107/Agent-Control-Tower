import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  X,
  Code
} from 'lucide-react';
import './Telemetry.css';

const Telemetry = () => {
  const [telemetry, setTelemetry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filters
  const [agentFilter, setAgentFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [traceSearch, setTraceSearch] = useState('');

  // Selected for Inspect Modal
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { page, limit };
      if (agentFilter !== 'all') params.agentId = agentFilter;
      if (eventTypeFilter !== 'all') params.eventType = eventTypeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (traceSearch) params.traceId = traceSearch.trim();

      const res = await api.get('/telemetry', { params });
      if (res.data.success) {
        setTelemetry(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load telemetry events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [page, agentFilter, eventTypeFilter, statusFilter, sourceFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTelemetry();
  };

  return (
    <div className="telemetry-page">
      {/* Page Header */}
      <div className="telemetry-header">
        <div className="telemetry-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Telemetry Explorer</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Real-time event stream, duration, token usage and state-delta evidence inspector</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="telemetry-controls">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="Search by Trace ID..."
            value={traceSearch}
            onChange={(e) => setTraceSearch(e.target.value)}
            style={{ width: '100%' }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
            <Search size={16} />
          </button>
        </form>

        <select value={eventTypeFilter} onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}>
          <option value="all">Event: All</option>
          <option value="llm_call">LLM Call</option>
          <option value="tool_execution">Tool Execution</option>
          <option value="agent_handoff">Agent Handoff</option>
          <option value="workflow_step">Workflow Step</option>
          <option value="state_change">State Change</option>
          <option value="error">Error</option>
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">Status: All</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
          <option value="timeout">Timeout</option>
        </select>

        <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}>
          <option value="all">Source: All</option>
          <option value="simulated">Simulated Only</option>
          <option value="live">Live Only</option>
        </select>

        <button onClick={fetchTelemetry} className="icon-btn" title="Refresh">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Telemetry Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-container">
            <RefreshCw size={24} className="spin" />
            <span>Loading telemetry stream...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <AlertCircle size={28} color="var(--status-danger)" />
            <span>{error}</span>
            <button onClick={fetchTelemetry} className="btn-secondary" style={{ marginTop: '0.5rem' }}>Retry</button>
          </div>
        ) : telemetry.length === 0 ? (
          <div className="empty-container">
            <Activity size={36} color="var(--text-muted)" />
            <p>No telemetry events found matching the criteria.</p>
          </div>
        ) : (
          <>
            <table className="telemetry-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Trace / Span ID</th>
                  <th>Agent ID</th>
                  <th>Event Type</th>
                  <th>Duration</th>
                  <th>Tokens</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.map((t) => (
                  <tr key={t._id} onClick={() => setSelectedEvent(t)}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{t.traceId}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.spanId}
                      </div>
                    </td>
                    <td>
                      <span className="agent-id-pill">{t.agentId}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{t.eventType.replace('_', ' ')}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{t.duration} ms</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{t.tokenUsage?.totalTokens || 0}</td>
                    <td>
                      <span className={`status-badge status-${t.status === 'success' ? 'Active' : 'Failed'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <SimulatedBadge source={t.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination-bar">
              <span>Showing {telemetry.length} of {total} events</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', opacity: page <= 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="btn-secondary"
                  style={{ padding: '0.3rem 0.75rem', opacity: page * limit >= total ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Event Details & State-Delta Modal */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Event Inspector</span>
                  <SimulatedBadge source={selectedEvent.source} />
                </h2>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Trace: {selectedEvent.traceId} | Span: {selectedEvent.spanId}
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            {/* State-Delta Evidence Section */}
            {selectedEvent.stateDelta && (
              <div className="state-delta-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.4rem' }}>
                  <Layers size={14} />
                  <span>State-Delta Evidence</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Previous Ref: </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedEvent.stateDelta.previousStateRef || 'GENESIS (None)'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Ref: </span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedEvent.stateDelta.currentStateRef || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Changed Fields: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {Array.isArray(selectedEvent.stateDelta.changedFields)
                      ? selectedEvent.stateDelta.changedFields.join(', ') || 'No mutations'
                      : JSON.stringify(selectedEvent.stateDelta.changedFields)}
                  </span>
                </div>
              </div>
            )}

            {/* Error Stack Trace if error */}
            {selectedEvent.errorInfo?.message && (
              <div style={{ background: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  Error: {selectedEvent.errorInfo.code || 'FAILURE'}
                </div>
                <div style={{ color: '#fecaca', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                  {selectedEvent.errorInfo.message}
                  {selectedEvent.errorInfo.stack && `\n\n${selectedEvent.errorInfo.stack}`}
                </div>
              </div>
            )}

            {/* Raw JSON viewer */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                <Code size={14} />
                <span>Normalized Schema JSON</span>
              </div>
              <div className="json-viewer">
                {JSON.stringify(selectedEvent, null, 2)}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setSelectedEvent(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Telemetry;
