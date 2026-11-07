import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SimulatedBanner from '../components/SimulatedBanner';
import DemoScenariosModal from '../components/DemoScenariosModal';
import {
  LayoutDashboard,
  Bot,
  GitFork,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Workflow,
  CheckCircle2,
  FileText,
  Cpu,
  Settings,
  Search,
  LogOut,
  Radio,
  Play
} from 'lucide-react';
import '../styles/Layout.css';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasSimulatedData, setHasSimulatedData] = useState(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Agent Management', path: '/agents', icon: Bot },
    { name: 'Execution Lineage', path: '/lineage', icon: GitFork },
    { name: 'Telemetry Explorer', path: '/telemetry', icon: Activity },
    { name: 'Anomaly Detection', path: '/anomalies', icon: AlertTriangle },
    { name: 'Governance Centre', path: '/governance', icon: ShieldCheck },
    { name: 'Orchestration', path: '/orchestration', icon: Workflow },
    { name: 'Human Approval', path: '/approvals', icon: CheckCircle2 },
    { name: 'Audit Logs', path: '/audit', icon: FileText },
    { name: 'Integrations', path: '/integrations', icon: Cpu },
    { name: 'Settings', path: '/settings', icon: Settings, stretch: true }
  ];

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin': return 'badge-admin';
      case 'Operator': return 'badge-operator';
      default: return 'badge-viewer';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <Radio size={18} />
          </div>
          <div>
            <div className="brand-title">Agent Control Tower</div>
            <div className="brand-subtitle">AI Multi-Agent Ops</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
                {item.stretch && <span className="nav-badge-pill">Stretch</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Top Header Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search agents, traces, events, or policies..."
              />
            </div>
          </div>

          <div className="topbar-right">
            {/* Quick Demo Scenarios Trigger */}
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                borderColor: 'var(--accent-cyan)',
                color: 'var(--accent-cyan)'
              }}
              title="Launch End-to-End Evaluation Scenarios"
            >
              <Play size={13} fill="var(--accent-cyan)" />
              Demo Scenarios
            </button>

            {/* User Profile Pill */}
            {user && (
              <div className="user-profile-pill">
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                </div>
                <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </span>
              </div>
            )}

            {/* Logout Action */}
            <button
              onClick={handleLogout}
              className="logout-btn"
              title="Sign out of Control Tower"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Global Simulated Banner */}
        <SimulatedBanner isVisible={hasSimulatedData} />

        {/* Dynamic Route Viewport */}
        <main className="page-viewport">
          <Outlet context={{ setHasSimulatedData }} />
        </main>

        {/* Demo Scenarios Modal */}
        <DemoScenariosModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default MainLayout;
