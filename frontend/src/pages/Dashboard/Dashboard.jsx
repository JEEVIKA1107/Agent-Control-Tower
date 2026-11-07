import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import SimulatedBadge from '../../components/SimulatedBadge';
import {
  Users,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Zap,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const [sourceFilter, setSourceFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [metrics, setMetrics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, chartsRes] = await Promise.all([
        api.get('/dashboard/metrics', { params: { source: sourceFilter, timeRange } }),
        api.get('/dashboard/charts', { params: { source: sourceFilter, timeRange } })
      ]);

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.data);
      }
      if (chartsRes.data.success) {
        setCharts(chartsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to aggregate dashboard metrics from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [sourceFilter, timeRange]);

  const metricCards = [
    {
      label: 'Total Agents',
      value: metrics ? metrics.totalAgents : '--',
      icon: Users,
      color: 'var(--accent-blue)',
      footer: 'Registered orchestrators'
    },
    {
      label: 'Active Agents',
      value: metrics ? metrics.activeAgents : '--',
      icon: CheckCircle,
      color: 'var(--status-active)',
      footer: 'Operational runtime'
    },
    {
      label: 'Failed Agents',
      value: metrics ? metrics.failedAgents : '--',
      icon: XCircle,
      color: 'var(--status-danger)',
      footer: 'Require attention'
    },
    {
      label: 'Total Executions',
      value: metrics ? metrics.totalExecutions.toLocaleString() : '--',
      icon: Activity,
      color: 'var(--accent-cyan)',
      footer: 'Trace sessions'
    },
    {
      label: 'Average Latency',
      value: metrics ? `${metrics.averageLatency} ms` : '--',
      icon: Clock,
      color: 'var(--status-warning)',
      footer: 'Span roundtrip time'
    },
    {
      label: 'Total Token Usage',
      value: metrics ? metrics.totalTokenUsage.toLocaleString() : '--',
      icon: Zap,
      color: 'var(--accent-violet)',
      footer: 'Prompt + completion'
    },
    {
      label: 'Estimated Cost',
      value: metrics ? `$${metrics.estimatedCost.toFixed(4)}` : '--',
      icon: DollarSign,
      color: '#38bdf8',
      footer: metrics ? `Rate: $${metrics.costRatePer1k}/1K tokens` : 'Estimated cost'
    },
    {
      label: 'Active Anomalies',
      value: metrics ? metrics.activeAnomalies : '--',
      icon: AlertTriangle,
      color: 'var(--status-danger)',
      footer: 'Unresolved alerts'
    }
  ];

  const pieColors = ['#10b981', '#ef4444', '#f59e0b', '#38bdf8'];

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Overview Dashboard</h1>
            <SimulatedBadge source={sourceFilter === 'live' ? 'live' : 'simulated'} size="sm" />
          </div>
          <p>Real-time multi-agent telemetry, token burn visibility and estimated cost analytics</p>
        </div>

        <div className="filter-bar">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">Source: All Records</option>
            <option value="simulated">Source: Simulated Only</option>
            <option value="live">Source: Live Only</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button onClick={fetchDashboardData} className="icon-btn" title="Refresh Metrics">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="metric-grid">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="metric-card">
              <div className="metric-header">
                <span>{card.label}</span>
                <Icon size={16} color={card.color} />
              </div>
              <div className="metric-value">{card.value}</div>
              <div className="metric-footer">
                <span>{card.footer}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recharts Analytics Grid */}
      <div className="charts-grid">
        {/* Executions & Latency Trend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Executions & Latency Trend</h3>
            <span className="badge badge-simulated">Time-Series</span>
          </div>

          {loading ? (
            <div className="chart-placeholder">
              <RefreshCw size={24} className="spin" />
              <span>Aggregating time-series data...</span>
            </div>
          ) : charts?.timeSeries?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.timeSeries}>
                <defs>
                  <linearGradient id="colorExec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickFormatter={(t) => t.split(' ')[1] || t} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151e32', border: '1px solid #24324d', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="executions" stroke="#06b6d4" fillOpacity={1} fill="url(#colorExec)" name="Executions" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              <BarChart2 size={32} color="var(--text-muted)" />
              <span>No time-series executions recorded in this window</span>
            </div>
          )}
        </div>

        {/* Execution Status Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Status Breakdown</h3>
            <span className="badge badge-simulated">Ratio</span>
          </div>

          {loading ? (
            <div className="chart-placeholder">
              <RefreshCw size={24} className="spin" />
              <span>Aggregating statuses...</span>
            </div>
          ) : charts?.statusBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                >
                  {charts.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.status === 'error' ? '#ef4444' : pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#151e32', border: '1px solid #24324d', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              <PieChartIcon size={32} color="var(--text-muted)" />
              <span>No execution events recorded</span>
            </div>
          )}
        </div>
      </div>

      {/* Cost By Agent Breakdown Table */}
      <div className="table-container">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Estimated Cost Breakdown by Agent</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Top consumers</span>
        </div>

        {loading ? (
          <div className="loading-container">
            <RefreshCw size={20} className="spin" />
            <span>Calculating agent costs...</span>
          </div>
        ) : charts?.costByAgent?.length > 0 ? (
          <table className="agents-table">
            <thead>
              <tr>
                <th>Agent Identifier</th>
                <th>Total Ingested Tokens</th>
                <th>Estimated Cost</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {charts.costByAgent.map((agent) => (
                <tr key={agent.agentId}>
                  <td>
                    <span className="agent-id-pill">{agent.agentId}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{agent.tokens.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    ${agent.cost.toFixed(4)}
                  </td>
                  <td>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '4px', height: '6px', width: '120px', overflow: 'hidden' }}>
                      <div
                        style={{
                          background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
                          height: '100%',
                          width: `${Math.min((agent.tokens / (metrics?.totalTokenUsage || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-container">
            <p>No token consumption recorded for agents in this time window.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
