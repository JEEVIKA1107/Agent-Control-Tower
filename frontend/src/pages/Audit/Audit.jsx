import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Info,
  X,
  ArrowRight,
  Database
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import SimulatedBadge from '../../components/SimulatedBadge';
import './Audit.css';

const Audit = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Copy helper
  const [copiedHash, setCopiedHash] = useState(null);

  // Inspection modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Demo Tampering Target
  const [tamperSequence, setTamperSequence] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('[Audit] Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runVerification = useCallback(async () => {
    try {
      setVerifying(true);
      const res = await api.get('/audit/verify');
      if (res.data.success) {
        setVerificationResult(res.data.data);
        setLastVerifiedAt(new Date());
      }
    } catch (err) {
      console.error('[Audit] Verification check failed:', err);
      if (err.response?.data?.data) {
        setVerificationResult(err.response.data.data);
      }
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    runVerification();
  }, [fetchLogs, runVerification]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleSimulateTamper = async () => {
    if (!isAdmin) return;
    try {
      setTampering(true);
      const payload = tamperSequence ? { sequenceNumber: parseInt(tamperSequence, 10) } : {};
      await api.post('/audit/demo/tamper', payload);
      await fetchLogs();
      await runVerification();
    } catch (err) {
      alert(`Tampering simulation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setTampering(false);
    }
  };

  const handleRestoreChain = async () => {
    if (!isAdmin) return;
    try {
      setRestoring(true);
      await api.post('/audit/demo/restore');
      await fetchLogs();
      await runVerification();
    } catch (err) {
      alert(`Chain restoration failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
      log.eventId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.relatedAgent && log.relatedAgent.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.eventType && log.eventType.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = eventTypeFilter === 'ALL' || log.eventType === eventTypeFilter;
    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;

    return matchesSearch && matchesType && matchesSource;
  });

  const getEventBadgeClass = (eventType) => {
    switch (eventType) {
      case 'APPROVAL_DECISION':
        return 'badge-operator';
      case 'ACTION_EXECUTED':
        return 'badge-amber';
      case 'POLICY_UPDATED':
        return 'badge-admin';
      case 'ANOMALY_ACKNOWLEDGED':
        return 'badge-rose';
      case 'AGENT_REGISTERED':
      case 'INTEGRATION_CONFIGURED':
        return 'badge-live';
      default:
        return 'badge-viewer';
    }
  };

  return (
    <div className="audit-container">
      {/* Header */}
      <div className="audit-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Cryptographic Audit Ledger</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Immutable SHA-256 hash-chained event ledger with deterministic ordering, tamper detection and cryptographic chain verification
          </p>
        </div>

        <div className="audit-actions">
          <button
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={runVerification}
            disabled={verifying}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ShieldCheck size={16} className={verifying ? 'spin' : ''} />
            {verifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verificationResult && (
        <div className={`verification-banner ${verificationResult.valid ? 'valid' : 'tampered'}`}>
          <div className="verification-icon-wrapper">
            {verificationResult.valid ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>
          <div className="verification-content">
            <div className="verification-headline">
              <div className="verification-title">
                {verificationResult.valid
                  ? 'Cryptographic Ledger Integrity: 100% Verified'
                  : 'Tampering Alert: Cryptographic Chain Broken!'}
              </div>
              <span className={`badge ${verificationResult.valid ? 'badge-live' : 'badge-rose'}`}>
                {verificationResult.valid ? 'INTEGRITY VALID' : 'TAMPER DETECTED'}
              </span>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              {verificationResult.message || verificationResult.reason}
            </p>

            {verificationResult.valid ? (
              <div className="verification-meta-grid">
                <div className="verification-meta-item">
                  Total Chained Records: <strong>{verificationResult.totalRecords}</strong>
                </div>
                <div className="verification-meta-item">
                  Predecessor Genesis: <strong>00000000...</strong>
                </div>
                <div className="verification-meta-item">
                  Latest Tip Hash: <strong>{verificationResult.latestHash?.substring(0, 16)}...</strong>
                </div>
                <div className="verification-meta-item">
                  Last Checked: <strong>{lastVerifiedAt ? lastVerifiedAt.toLocaleTimeString() : 'Just now'}</strong>
                </div>
              </div>
            ) : (
              <div className="verification-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="verification-meta-item">
                  Broken Sequence: <strong style={{ color: 'var(--accent-rose)' }}>#{verificationResult.brokenSequenceNumber}</strong>
                </div>
                <div className="verification-meta-item">
                  Event ID: <strong>{verificationResult.eventId}</strong>
                </div>
                <div className="verification-meta-item">
                  Expected Hash: <strong style={{ color: 'var(--accent-emerald)' }}>{verificationResult.expectedHash?.substring(0, 16)}...</strong>
                </div>
                <div className="verification-meta-item">
                  Stored/Actual Hash: <strong style={{ color: 'var(--accent-rose)' }}>{verificationResult.actualHash?.substring(0, 16)}...</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cryptographic Security Boundary Disclosure */}
      <div className="security-disclosure">
        <Info size={20} className="disclosure-icon" />
        <div className="disclosure-content">
          <h4>Cryptographic Hash Chaining & Security Boundaries</h4>
          <p>
            Every audit record binds its monotonic sequence number, canonical JSON payload, and predecessor block hash:{' '}
            <code style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
              H_n = SHA-256(n ∥ canonicalJson(payload) ∥ H_&#123;n-1&#125;)
            </code>.
            Historical row modifications, unauthorized insertions, or deletions violate cryptographic linkage and are detected upon verification.
            <br />
            <strong>Important Security Boundary Notice:</strong> Hash chaining provides tamper-evident integrity inside the database. It does not prevent an adversary with full database superuser privileges from rewriting the entire database sequence unless anchored to external write-once-read-many (WORM) storage or an external transparency log.
          </p>
        </div>
      </div>

      {/* Admin-Only Demo Tampering Simulator */}
      <div className="tamper-card">
        <div className="tamper-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Demonstration: Cryptographic Tampering Simulator (Controlled Demo Only)
              </h3>
              <span className="badge badge-amber">DEMO ONLY</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Simulates an unauthorized row modification on seeded demo records to demonstrate cryptographic detection. Live records cannot be modified.
            </p>
          </div>

          {!isAdmin && (
            <span className="badge badge-viewer">Admin role required to simulate tampering</span>
          )}
        </div>

        <div className="tamper-actions-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Sequence #:</label>
            <input
              type="number"
              placeholder="e.g. 2"
              value={tamperSequence}
              onChange={(e) => setTamperSequence(e.target.value)}
              disabled={!isAdmin || tampering || restoring}
              style={{
                width: '90px',
                padding: '0.35rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleSimulateTamper}
            disabled={!isAdmin || tampering || restoring}
            style={{
              borderColor: 'var(--accent-rose)',
              color: 'var(--accent-rose)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Unlock size={14} />
            {tampering ? 'Tampering...' : 'Simulate Unauthorized Modification'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleRestoreChain}
            disabled={!isAdmin || tampering || restoring}
            style={{
              borderColor: 'var(--accent-emerald)',
              color: 'var(--accent-emerald)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <RefreshCw size={14} className={restoring ? 'spin' : ''} />
            {restoring ? 'Restoring Chain...' : 'Restore & Recompute Chain'}
          </button>
        </div>
      </div>

      {/* Audit Ledger Explorer */}
      <div className="audit-table-card">
        <div className="audit-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={16} color="var(--accent-blue)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Sequential Event Ledger ({filteredLogs.length} of {logs.length})
            </span>
          </div>

          <div className="audit-filter-group">
            {/* Search */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search event, actor, agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              />
            </div>

            {/* Event Type Filter */}
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="ALL">All Event Types</option>
              <option value="APPROVAL_DECISION">Approval Decision</option>
              <option value="ACTION_EXECUTED">Action Executed</option>
              <option value="POLICY_UPDATED">Policy Updated</option>
              <option value="ANOMALY_ACKNOWLEDGED">Anomaly Acknowledged</option>
              <option value="AGENT_REGISTERED">Agent Registered</option>
              <option value="INTEGRATION_CONFIGURED">Integration Configured</option>
              <option value="DEMO_SEED">Demo Seed</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="ALL">All Sources</option>
              <option value="live">Live</option>
              <option value="simulated">Simulated</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Seq #</th>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Actor</th>
                <th>Target Reference</th>
                <th>Previous Hash (H_prev)</th>
                <th>Current Hash (H_n)</th>
                <th>Source</th>
                <th style={{ textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading cryptographic ledger...' : 'No audit records match the selected filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isTamperedRow =
                    verificationResult &&
                    !verificationResult.valid &&
                    log.sequenceNumber === verificationResult.brokenSequenceNumber;

                  return (
                    <tr key={log.eventId} className={isTamperedRow ? 'tampered-row' : ''}>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        #{log.sequenceNumber}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${getEventBadgeClass(log.eventType)}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{log.actorName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.userId}
                        </div>
                      </td>
                      <td>
                        {log.relatedAgent ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {log.relatedAgent}
                          </span>
                        ) : log.relatedExecution ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {log.relatedExecution}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>System Global</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="hash-cell"
                          title={`Click to copy previous hash: ${log.previousHash}`}
                          onClick={() => handleCopy(log.previousHash, `prev-${log.sequenceNumber}`)}
                        >
                          {copiedHash === `prev-${log.sequenceNumber}` ? (
                            <Check size={12} color="var(--accent-emerald)" />
                          ) : (
                            <Copy size={12} />
                          )}
                          {log.previousHash.substring(0, 10)}...
                        </span>
                      </td>
                      <td>
                        <span
                          className="hash-cell"
                          title={`Click to copy current hash: ${log.currentHash}`}
                          onClick={() => handleCopy(log.currentHash, `curr-${log.sequenceNumber}`)}
                        >
                          {copiedHash === `curr-${log.sequenceNumber}` ? (
                            <Check size={12} color="var(--accent-emerald)" />
                          ) : (
                            <Copy size={12} />
                          )}
                          {log.currentHash.substring(0, 10)}...
                        </span>
                      </td>
                      <td>
                        <SimulatedBadge source={log.source} size="xs" />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setSelectedRecord(log)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <FileText size={13} style={{ marginRight: '0.25rem' }} />
                          Payload
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payload Inspection Modal */}
      {selectedRecord && (
        <div className="detail-modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  Audit Record #{selectedRecord.sequenceNumber} – {selectedRecord.eventType}
                </h3>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedRecord(null)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="detail-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event ID</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{selectedRecord.eventId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timestamp (ISO)</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {new Date(selectedRecord.timestamp).toISOString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Actor Identity</span>
                  <div style={{ fontSize: '0.8rem' }}>
                    {selectedRecord.actorName} ({selectedRecord.userId})
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data Source</span>
                  <div>
                    <SimulatedBadge source={selectedRecord.source} size="xs" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous Block Hash</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.4rem', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                  {selectedRecord.previousHash}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current SHA-256 Digest</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.4rem', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all', color: 'var(--accent-blue)' }}>
                  {selectedRecord.currentHash}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Canonical Action Details Payload</span>
                <pre
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    overflowX: 'auto',
                    border: '1px solid var(--border-card)',
                    maxHeight: '220px'
                  }}
                >
                  {JSON.stringify(selectedRecord.actionDetails, null, 2)}
                </pre>
              </div>
            </div>

            <div className="detail-modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Audit;
