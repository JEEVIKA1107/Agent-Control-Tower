import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  RotateCcw,
  X,
  ExternalLink,
  ChevronRight,
  Terminal,
  Clock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DemoScenariosModal.css';

const DemoScenariosModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, isAdmin, isOperator } = useAuth();
  const isOperatorOrAdmin = isAdmin || isOperator;

  const [runningScenario, setRunningScenario] = useState(null);
  const [output, setOutput] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (!isOpen) return null;

  const runScenario = async (endpoint, name) => {
    try {
      setRunningScenario(name);
      setOutput({ loading: true, name });
      const res = await api.post(`/demo/${endpoint}`);
      if (res.data.success) {
        setOutput({
          success: true,
          name,
          data: res.data.data,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      setOutput({
        success: false,
        name,
        error: err.response?.data?.message || err.message,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setRunningScenario(null);
    }
  };

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      const res = await api.post('/demo/reset');
      if (res.data.success) {
        setOutput({
          success: true,
          name: 'Demo State Reset',
          data: { message: res.data.message },
          timestamp: new Date().toLocaleTimeString()
        });
        setConfirmResetOpen(false);
      }
    } catch (err) {
      alert(`Reset failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const navigateTo = (path) => {
    onClose();
    navigate(path);
  };

  const scenarios = [
    {
      id: 'scenario-a',
      title: 'Scenario A: Normal Agent Execution',
      desc: 'Ingests a healthy 3-span execution trace. Updates token counts and cost aggregates without triggering anomaly alerts.',
      icon: CheckCircle2,
      iconColor: 'var(--accent-emerald)',
      targetPage: '/telemetry',
      targetLabel: 'View in Telemetry & Lineage',
      adminOnly: false
    },
    {
      id: 'scenario-b',
      title: 'Scenario B: Repeated Execution Anomaly',
      desc: 'Generates recursive call loops exceeding threshold (4 calls). Detects anomaly and auto-generates circuit breaker recommendation.',
      icon: RotateCcw,
      iconColor: 'var(--accent-rose)',
      targetPage: '/anomalies',
      targetLabel: 'View in Anomaly Hub',
      adminOnly: false
    },
    {
      id: 'scenario-c',
      title: 'Scenario C: Token Surge Violation',
      desc: 'Emits a single execution consuming 78,500 tokens (exceeding 50k ceiling). Detects surge and creates token throttling recommendation.',
      icon: Zap,
      iconColor: 'var(--accent-amber)',
      targetPage: '/governance',
      targetLabel: 'View in Governance & Approvals',
      adminOnly: false
    },
    {
      id: 'scenario-d',
      title: 'Scenario D: Human Approval Decision',
      desc: 'Simulates operator approving one request and rejecting another. Records ActionExecution status as simulated or not_executed.',
      icon: Shield,
      iconColor: 'var(--accent-blue)',
      targetPage: '/approvals',
      targetLabel: 'View in Approval Ledger',
      adminOnly: false
    },
    {
      id: 'scenario-e',
      title: 'Scenario E: Cryptographic Audit Verification',
      desc: 'Verifies valid chain -> executes controlled demo tamper -> catches broken sequence -> restores cryptographic validity.',
      icon: Terminal,
      iconColor: 'var(--accent-purple)',
      targetPage: '/audit',
      targetLabel: 'View in Audit Ledger',
      adminOnly: true
    }
  ];

  return (
    <div className="demo-modal-overlay" onClick={onClose}>
      <div className="demo-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="demo-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Play size={20} color="var(--accent-cyan)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Interactive Demo Scenario Launcher
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Trigger end-to-end evaluation workflows directly against live MongoDB backend
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="demo-modal-body">
          {/* Scenarios Grid */}
          <div className="scenario-card-grid">
            {scenarios.map((scen) => {
              const Icon = scen.icon;
              const disabled =
                runningScenario !== null ||
                (scen.adminOnly && !isAdmin) ||
                (!scen.adminOnly && !isOperatorOrAdmin);

              return (
                <div key={scen.id} className="scenario-card">
                  <div>
                    <div className="scenario-card-title">
                      <Icon size={18} color={scen.iconColor} />
                      <span>{scen.title}</span>
                    </div>
                    <p className="scenario-card-desc">{scen.desc}</p>
                  </div>

                  <div className="scenario-card-footer">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {scen.adminOnly ? 'Admin only' : 'Operator & Admin'}
                    </span>
                    <button
                      className="btn btn-secondary"
                      onClick={() => runScenario(scen.id, scen.title)}
                      disabled={disabled}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <Play size={12} />
                      {runningScenario === scen.title ? 'Running...' : 'Run Scenario'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset Baseline Action */}
          <div
            style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px dashed var(--accent-rose)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-rose)', marginBottom: '0.2rem' }}>
                Reset Demo State to Genesis Baseline
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Cleans all simulated demo records and re-seeds default agents, policies, and ledger. Preserves all genuine live records.
              </div>
            </div>

            {confirmResetOpen ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleResetDemo}
                  disabled={resetting || !isAdmin}
                  style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmResetOpen(false)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmResetOpen(true)}
                disabled={!isAdmin || runningScenario !== null}
                style={{
                  fontSize: '0.75rem',
                  borderColor: 'var(--accent-rose)',
                  color: 'var(--accent-rose)',
                  padding: '0.35rem 0.65rem'
                }}
              >
                Reset Demo Data
              </button>
            )}
          </div>

          {/* Live Execution Feedback Box */}
          {output && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Execution Response: {output.name} ({output.timestamp || 'Running'})
                </span>
                {output.success && (
                  <span className="badge badge-live">SUCCESS 200</span>
                )}
                {output.error && (
                  <span className="badge badge-rose">ERROR</span>
                )}
              </div>

              <pre className="scenario-output-box">
                {output.loading
                  ? 'Executing scenario on server...'
                  : JSON.stringify(output.data || output.error, null, 2)}
              </pre>

              {output.success && (
                <div className="scenario-nav-pills">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jump directly to results:</span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigateTo('/telemetry')}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    Telemetry Explorer <ChevronRight size={12} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigateTo('/anomalies')}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    Anomaly Hub <ChevronRight size={12} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigateTo('/approvals')}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    Approval Ledger <ChevronRight size={12} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigateTo('/audit')}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                  >
                    Audit Ledger <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoScenariosModal;
