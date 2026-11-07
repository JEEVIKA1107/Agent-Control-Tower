import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../../services/api';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  GitFork,
  Layers,
  Clock,
  Zap,
  AlertCircle,
  X,
  Code,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import './Lineage.css';

// Custom Node Component for React Flow
const AgentFlowNode = ({ data, selected }) => {
  const isError = data.status === 'error';

  return (
    <div className={`agent-flow-node ${selected ? 'selected' : ''} ${isError ? 'failed' : ''}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#38bdf8', width: 8, height: 8 }}
      />

      <div className="node-header">
        <span className="node-agent-name" title={data.agentName}>
          {data.agentName}
        </span>
        <span className={`status-badge status-${isError ? 'Failed' : 'Active'}`} style={{ fontSize: '0.65rem' }}>
          {data.status}
        </span>
      </div>

      <div className="node-type">
        {data.agentType} • {data.eventType}
      </div>

      <div className="node-metrics">
        <span>{data.duration} ms</span>
        <span>{data.tokens?.totalTokens || 0} tokens</span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#38bdf8', width: 8, height: 8 }}
      />
    </div>
  );
};

const nodeTypes = {
  agentNode: AgentFlowNode
};

const Lineage = () => {
  const [traces, setTraces] = useState([]);
  const [selectedTraceId, setSelectedTraceId] = useState('');
  const [loadingTraces, setLoadingTraces] = useState(true);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [error, setError] = useState(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  // 1. Fetch available traces
  const fetchTraces = async () => {
    try {
      setLoadingTraces(true);
      const res = await api.get('/executions/traces');
      if (res.data.success && res.data.data.length > 0) {
        setTraces(res.data.data);
        if (!selectedTraceId) {
          setSelectedTraceId(res.data.data[0].traceId);
        }
      }
    } catch (err) {
      setError('Failed to load trace index');
    } finally {
      setLoadingTraces(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  // 2. Fetch lineage nodes & edges when selectedTraceId changes
  const fetchLineage = async (traceId) => {
    if (!traceId) return;
    try {
      setLoadingGraph(true);
      setError(null);
      setSelectedNodeData(null);

      const res = await api.get(`/executions/lineage/${traceId}`);
      if (res.data.success) {
        setNodes(res.data.nodes);
        setEdges(res.data.edges);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load trace lineage graph');
    } finally {
      setLoadingGraph(false);
    }
  };

  useEffect(() => {
    if (selectedTraceId) {
      fetchLineage(selectedTraceId);
    }
  }, [selectedTraceId]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeData(node.data);
  }, []);

  return (
    <div className="lineage-page">
      {/* Header Bar */}
      <div className="lineage-header">
        <div className="lineage-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Execution Lineage Graph</h1>
            <SimulatedBadge source="simulated" size="sm" />
          </div>
          <p>Interactive trace visualization showing parent-child spans, error cascades and state mutations</p>
        </div>

        {/* Trace Selector Dropdown */}
        <div className="lineage-controls">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Trace:</span>
          <select
            value={selectedTraceId}
            onChange={(e) => setSelectedTraceId(e.target.value)}
            disabled={loadingTraces || traces.length === 0}
            style={{ maxWidth: '320px', fontFamily: 'var(--font-mono)' }}
          >
            {traces.map((t) => (
              <option key={t.traceId} value={t.traceId}>
                {t.traceId} ({t.hasErrors ? '⚠️ Error' : '✓ Success'} • {t.spanCount} spans)
              </option>
            ))}
          </select>
          <button onClick={() => fetchLineage(selectedTraceId)} className="icon-btn" title="Reload Graph">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main Graph Canvas */}
      <div className="canvas-container">
        {loadingGraph ? (
          <div className="loading-container" style={{ height: '100%' }}>
            <RefreshCw size={28} className="spin" />
            <span>Rendering lineage execution graph...</span>
          </div>
        ) : error ? (
          <div className="error-container" style={{ height: '100%' }}>
            <AlertCircle size={32} color="var(--status-danger)" />
            <span>{error}</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="empty-container" style={{ height: '100%' }}>
            <GitFork size={40} color="var(--text-muted)" />
            <p>No lineage nodes recorded for this trace.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            style={{ background: '#090e1a' }}
          >
            <Background color="#1e293b" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => (node.data?.status === 'error' ? '#ef4444' : '#06b6d4')}
              maskColor="rgba(10, 15, 29, 0.7)"
              style={{ background: '#0f172a', border: '1px solid #1e293b' }}
            />
          </ReactFlow>
        )}

        {/* Selected Node Details Drawer */}
        {selectedNodeData && (
          <aside className="lineage-drawer">
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedNodeData.agentName}
                </h3>
                <span className="agent-id-pill">{selectedNodeData.agentId}</span>
              </div>
              <button onClick={() => setSelectedNodeData(null)} className="icon-btn">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status</span>
                <div style={{ fontWeight: 600 }}>{selectedNodeData.status}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Event Type</span>
                <div style={{ fontWeight: 600 }}>{selectedNodeData.eventType}</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Duration</span>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedNodeData.duration} ms</div>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Tokens</span>
                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{selectedNodeData.tokens?.totalTokens || 0}</div>
              </div>
            </div>

            {/* Error banner if failed */}
            {selectedNodeData.status === 'error' && selectedNodeData.errorInfo?.message && (
              <div style={{ background: 'var(--status-danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                  Failure Code: {selectedNodeData.errorInfo.code}
                </div>
                <div style={{ color: '#fecaca', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  {selectedNodeData.errorInfo.message}
                </div>
              </div>
            )}

            {/* State-Delta Evidence */}
            {selectedNodeData.stateDelta && (
              <div className="state-delta-card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.75rem' }}>
                  <Layers size={13} />
                  <span>State Delta Mutation</span>
                </div>
                <div style={{ fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Prev: </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNodeData.stateDelta.previousStateRef || 'ROOT'}</span>
                </div>
                <div style={{ fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedNodeData.stateDelta.currentStateRef || 'N/A'}</span>
                </div>
                <div style={{ fontSize: '0.7rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mutations: </span>
                  <span>{Array.isArray(selectedNodeData.stateDelta.changedFields) ? selectedNodeData.stateDelta.changedFields.join(', ') : 'None'}</span>
                </div>
              </div>
            )}

            {/* Input & Output Metadata */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Span Input / Output
              </span>
              <div className="json-viewer" style={{ maxHeight: '180px' }}>
                {JSON.stringify({ input: selectedNodeData.inputMetadata, output: selectedNodeData.outputMetadata }, null, 2)}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Lineage;
