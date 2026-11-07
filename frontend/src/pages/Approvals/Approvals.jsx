import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  X,
  FileCheck,
  Cpu
} from 'lucide-react';
import './Approvals.css';

const Approvals = () => {
  const { isOperator, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Decision Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingDecision, setPendingDecision] = useState('Approved'); // 'Approved' | 'Rejected'
  const [reviewerComment, setReviewerComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovalsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (sourceFilter !== 'all') params.source = sourceFilter;

      const [reqRes, actRes] = await Promise.all([
        api.get('/approvals', { params }),
        api.get('/approvals/actions')
      ]);

      if (reqRes.data.success) {
        setRequests(reqRes.data.data);
      }
      if (actRes.data.success) {
        setActions(actRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovalsData();
  }, [statusFilter, severityFilter, sourceFilter]);

  const openDecisionModal = (req, decision) => {
    setSelectedRequest(req);
    setPendingDecision(decision);
    setReviewerComment(decision === 'Approved' ? 'Policy action authorized by operator' : 'Action declined by operator');
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      const res = await api.put(`/approvals/${selectedRequest.requestId}/decision`, {
        decision: pendingDecision,
        comment: reviewerComment
      });

      if (res.data.success) {
        setSelectedRequest(null);
        fetchApprovalsData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="approvals-page">
      {/* Header */}
      <div className="approvals-header">
        <div className="approvals-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Human Approval Centre (HITL)</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Human-in-the-Loop governance queue: inspect anomalies, authorize throttling or circuit breakers</p>
        </div>

        <button onClick={fetchApprovalsData} className="icon-btn" title="Refresh Queue">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Separation Banner */}
      <div className="separation-banner">
        <ShieldAlert size={16} />
        <span>
          Strict 3-Tier Separation: <strong>1. Recommendation</strong> (suggested) → <strong>2. ApprovalRequest</strong> (human decision) → <strong>3. ActionExecution</strong> (status: simulated). Approving a request creates a simulated action and never assumes external automated execution.
        </span>
      </div>

      {/* Controls Bar */}
      <div className="agents-controls">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Status: All</option>
          <option value="Pending">Pending Decision</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">Severity: All</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
        </select>

        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">Source: All</option>
          <option value="simulated">Simulated Only</option>
          <option value="live">Live Only</option>
        </select>
      </div>

      {/* Approval Requests Table */}
      <div className="table-container">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Active Human Approval Queue</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{requests.length} Requests</span>
        </div>

        {loading ? (
          <div className="loading-container">
            <RefreshCw size={24} className="spin" />
            <span>Loading approval requests...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <AlertCircle size={28} color="var(--status-danger)" />
            <span>{error}</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-container">
            <CheckCircle2 size={36} color="var(--status-active)" />
            <p>No approval requests pending. System governance queue is clear.</p>
          </div>
        ) : (
          <table className="agents-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Agent</th>
                <th>Recommended Action</th>
                <th>Reason</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Decided By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{req.requestId}</td>
                  <td>
                    <span className="agent-id-pill">{req.agentId}</span>
                  </td>
                  <td>
                    <span className={`action-pill action-${req.actionType}`}>
                      {req.actionType.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {req.reason}
                  </td>
                  <td>
                    <span className={`severity-badge severity-${req.severity}`}>
                      {req.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${req.status === 'Approved' ? 'Active' : req.status === 'Rejected' ? 'Failed' : 'Idle'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {req.decidedBy ? (
                      <div>
                        <div>{req.decidedBy}</div>
                        <div style={{ fontSize: '0.65rem' }}>{new Date(req.decidedAt).toLocaleTimeString()}</div>
                      </div>
                    ) : (
                      'Awaiting Review'
                    )}
                  </td>
                  <td>
                    {req.status === 'Pending' ? (
                      isOperator ? (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openDecisionModal(req, 'Approved')}
                            className="btn-approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openDecisionModal(req, 'Rejected')}
                            className="btn-reject"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Viewer (Read-only)</span>
                      )
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Action Executions Table */}
      <div className="table-container">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Action Execution Ledger</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Execution status resulting from human decisions (strictly simulated)
            </span>
          </div>
          <span className="badge badge-simulated">{actions.length} Executions</span>
        </div>

        {actions.length === 0 ? (
          <div className="empty-container">
            <Cpu size={32} color="var(--text-muted)" />
            <p>No action executions recorded yet.</p>
          </div>
        ) : (
          <table className="agents-table">
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Approval ID</th>
                <th>Target Agent</th>
                <th>Action</th>
                <th>Status</th>
                <th>Output Summary</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((act) => (
                <tr key={act._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{act.actionExecutionId}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {act.approvalRequestId}
                  </td>
                  <td>
                    <span className="agent-id-pill">{act.agentId}</span>
                  </td>
                  <td>
                    <span className={`action-pill action-${act.actionType}`}>
                      {act.actionType.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${act.status === 'simulated' ? 'badge-simulated' : 'badge-viewer'}`}>
                      {act.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '340px' }}>
                    {act.outputSummary}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(act.executedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Decision Modal */}
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {pendingDecision === 'Approved' ? 'Authorize Governance Action' : 'Reject Governance Action'}
              </h2>
              <button onClick={() => setSelectedRequest(null)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDecisionSubmit}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Target Agent</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedRequest.agentId}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Action Type</div>
                <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedRequest.actionType}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Reason</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedRequest.reason}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Reviewer Commentary *</label>
                <textarea
                  rows={3}
                  required
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Decision will be logged as {user?.email} with action execution status <strong>'simulated'</strong>.
              </p>

              <div className="modal-actions">
                <button type="button" onClick={() => setSelectedRequest(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={pendingDecision === 'Approved' ? 'btn-primary' : 'btn-danger'}
                >
                  {submitting ? 'Submitting...' : `Confirm ${pendingDecision}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
