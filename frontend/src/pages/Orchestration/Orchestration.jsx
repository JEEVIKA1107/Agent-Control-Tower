import React from 'react';
import {
  Workflow,
  GitMerge,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';
import SimulatedBadge from '../../components/SimulatedBadge';
import './Orchestration.css';

const Orchestration = () => {
  const workflows = [
    {
      id: 'wf-support-01',
      name: 'Customer Support Triage Pipeline',
      framework: 'LangGraph',
      status: 'Active',
      nodes: ['Dispatcher', 'Query Synthesizer', 'Sentinel Guard', 'Client Response'],
      description: 'Hierarchical state machine delegating customer support queries across specialized agents with human escalation fallback.'
    },
    {
      id: 'wf-financial-02',
      name: 'Autonomous Research Synthesis',
      framework: 'AutoGen',
      status: 'Active',
      nodes: ['Research Coordinator', 'Market Analyst', 'Fact Verifier'],
      description: 'Conversational agent turn-taking protocol aggregating external financial data into verified operator briefs.'
    },
    {
      id: 'wf-hierarchical-03',
      name: 'Sequential Task Delegation (CrewAI)',
      framework: 'CrewAI',
      status: 'Planned',
      nodes: ['Crew Manager', 'Worker Agent A', 'Worker Agent B'],
      description: 'Sequential hierarchical task runner (planned integration; scheduled for external protocol support).'
    }
  ];

  const conflicts = [
    {
      conflictId: 'cnf-101',
      timestamp: '2026-11-07 10:14:22',
      workflow: 'Customer Support Triage Pipeline',
      conflictType: 'Concurrent State Lock',
      involvedAgents: ['agent-customer-support-01', 'agent-sql-generator-03'],
      resolution: 'Resolved: Dispatcher yielded priority to SQL generator',
      status: 'Resolved'
    },
    {
      conflictId: 'cnf-102',
      timestamp: '2026-11-07 09:45:10',
      workflow: 'Autonomous Research Synthesis',
      conflictType: 'Handoff Timeout',
      involvedAgents: ['agent-market-researcher-04', 'agent-anomaly-sentinel-02'],
      resolution: 'Isolated: Circuit breaker activated on recursion limit',
      status: 'Isolated'
    },
    {
      conflictId: 'cnf-103',
      timestamp: '2026-11-07 08:30:00',
      workflow: 'Customer Support Triage Pipeline',
      conflictType: 'Deadlock Detection',
      involvedAgents: ['agent-anomaly-sentinel-02', 'agent-customer-support-01'],
      resolution: 'Escalated: Operator approval request generated',
      status: 'Escalated'
    }
  ];

  return (
    <div className="orchestration-container">
      {/* Header */}
      <div className="orchestration-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Multi-Agent Orchestration</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Workflow topologies, inter-agent coordination graphs, and simulated conflict resolution records
          </p>
        </div>
      </div>

      {/* Honesty Disclosure Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderLeft: '4px solid var(--accent-violet)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        gap: '1rem'
      }}>
        <AlertTriangle size={20} color="var(--accent-violet)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Orchestration Scope & Simulation Notice
          </h4>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
            Multi-agent coordination topologies and conflict resolution logs below represent <strong>simulated state transitions</strong>. Live framework execution traces run through the OpenTelemetry ingestion gateway, while inter-agent mesh protocol (A2A) is a planned enhancement.
          </p>
        </div>
      </div>

      {/* Topologies Grid */}
      <div className="orchestration-grid">
        {workflows.map((wf) => (
          <div key={wf.id} className="workflow-card">
            <div>
              <div className="workflow-card-top">
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {wf.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wf.framework}</span>
                </div>
                <span className={`badge ${wf.status === 'Active' ? 'badge-live' : 'badge-viewer'}`}>
                  {wf.status}
                </span>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '1rem 0' }}>
                {wf.description}
              </p>
            </div>

            <div className="workflow-topology-box">
              {wf.nodes.map((node, i) => (
                <React.Fragment key={i}>
                  <span className="topology-node">{node}</span>
                  {i < wf.nodes.length - 1 && <span className="topology-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Conflict Resolution Ledger */}
      <div className="conflict-table-card">
        <div className="conflict-table-header">
          <GitMerge size={18} color="var(--accent-violet)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Simulated Orchestration Conflict Records
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="conflict-table">
            <thead>
              <tr>
                <th>Conflict ID</th>
                <th>Timestamp</th>
                <th>Workflow</th>
                <th>Conflict Type</th>
                <th>Involved Agents</th>
                <th>Resolution Summary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((cnf) => (
                <tr key={cnf.conflictId}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{cnf.conflictId}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{cnf.timestamp}</td>
                  <td>{cnf.workflow}</td>
                  <td>
                    <span className="badge badge-amber">{cnf.conflictType}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {cnf.involvedAgents.join(', ')}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {cnf.resolution}
                  </td>
                  <td>
                    <span className={`badge ${cnf.status === 'Resolved' ? 'badge-live' : cnf.status === 'Isolated' ? 'badge-operator' : 'badge-rose'}`}>
                      {cnf.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orchestration;
