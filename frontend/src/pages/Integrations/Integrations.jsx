import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle,
  AlertTriangle,
  Clock,
  Radio,
  RefreshCw,
  Layers,
  Terminal,
  Activity,
  Workflow,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';
import api from '../../services/api';
import SimulatedBadge from '../../components/SimulatedBadge';
import './Integrations.css';

const Integrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/integrations');
      if (res.data.success) {
        setIntegrations(res.data.data);
      }
    } catch (err) {
      console.error('[Integrations] Failed to fetch integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Connected':
        return <span className="badge badge-live">Connected</span>;
      case 'Simulated Demo':
        return <span className="badge badge-amber">Simulated Demo</span>;
      case 'Planned':
        return <span className="badge badge-viewer">Planned</span>;
      default:
        return <span className="badge badge-rose">Disconnected</span>;
    }
  };

  const getIconForType = (type, name) => {
    if (name.includes('OpenTelemetry')) return <Radio size={20} color="var(--accent-emerald)" />;
    if (name.includes('LangGraph')) return <Workflow size={20} color="var(--accent-blue)" />;
    if (name.includes('AutoGen')) return <Cpu size={20} color="var(--accent-amber)" />;
    if (name.includes('CrewAI')) return <Layers size={20} color="var(--accent-purple)" />;
    if (name.includes('MCP')) return <Terminal size={20} color="var(--accent-blue)" />;
    return <Compass size={20} color="var(--accent-emerald)" />;
  };

  const liveCount = integrations.filter((i) => i.status === 'Connected' && i.source === 'live').length;
  const simulatedCount = integrations.filter((i) => i.status === 'Simulated Demo').length;
  const plannedCount = integrations.filter((i) => i.status === 'Planned').length;

  return (
    <div className="integrations-container">
      {/* Header */}
      <div className="integrations-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Integrations & Protocol Hub</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            External framework adapters, telemetry protocol ingestion, tool protocols (MCP) and inter-agent communication (A2A)
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={fetchIntegrations}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh Status
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="integrations-summary-grid">
        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            <Radio size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-val">{liveCount}</div>
            <div className="stat-lbl">Live OTel Ingestor</div>
          </div>
        </div>

        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <Cpu size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-val">{simulatedCount}</div>
            <div className="stat-lbl">Simulated Framework Adapters</div>
          </div>
        </div>

        <div className="integration-stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
            <Layers size={22} />
          </div>
          <div className="stat-content">
            <div className="stat-val">{plannedCount}</div>
            <div className="stat-lbl">Planned Protocols & Frameworks</div>
          </div>
        </div>
      </div>

      {/* Architectural Disclosure */}
      <div className="integrations-guidance-card">
        <AlertTriangle size={20} className="guidance-icon" />
        <div className="guidance-content">
          <h4>Integration Source & Execution Boundary Rules</h4>
          <p>
            • <strong>Live Ingestion:</strong> Only <code>OpenTelemetry (OTel)</code> runs a genuine live HTTP ingestion pipeline on <code>/api/telemetry/ingest</code>.
            <br />
            • <strong>Simulated Adapters:</strong> <code>LangGraph</code> and <code>AutoGen</code> adapters simulate agent trace structures for testing and UI lineage demonstrations. They are strictly labelled as <strong>Simulated Demo</strong>.
            <br />
            • <strong>Planned Protocols:</strong> <code>CrewAI</code>, <code>Model Context Protocol (MCP)</code>, and <code>Agent-to-Agent (A2A)</code> are future architectural protocols. They are marked <strong>Planned</strong> and do not simulate active connections.
          </p>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="integrations-grid">
        {integrations.map((item) => (
          <div key={item.integrationId} className="integration-card">
            <div>
              <div className="integration-card-top">
                <div className="integration-title-group">
                  <div
                    className="integration-icon-box"
                    style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid var(--border-card)' }}
                  >
                    {getIconForType(item.type, item.name)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                      {item.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.type}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                  {getStatusBadge(item.status)}
                  <SimulatedBadge source={item.source} size="xs" />
                </div>
              </div>

              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '1rem 0' }}>
                {item.description}
              </p>
            </div>

            <div className="integration-meta-list">
              <div className="integration-meta-row">
                <span className="meta-label">Data Source Type:</span>
                <span className="meta-value">{item.dataSourceType || 'None'}</span>
              </div>
              <div className="integration-meta-row">
                <span className="meta-label">Config Status:</span>
                <span className="meta-value" style={{ color: item.status === 'Connected' ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                  {item.configurationStatus}
                </span>
              </div>
              <div className="integration-meta-row">
                <span className="meta-label">Last Received Event:</span>
                <span className="meta-value">
                  {item.lastReceivedEvent
                    ? new Date(item.lastReceivedEvent).toLocaleTimeString()
                    : 'None (Planned)'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Integrations;
