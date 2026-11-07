import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Radio, AlertCircle, Shield, UserCheck, Eye } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect to authentication server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Radio size={24} />
          </div>
          <h1 className="login-title">Agent Control Tower</h1>
          <p className="login-subtitle">Multi-Agent Observability & Governance</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              className="form-input"
              placeholder="operator@controltower.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In to Control Tower'}
          </button>
        </form>

        {/* Demo Quick-Fill Roles */}
        <div className="demo-accounts-section">
          <div className="demo-title">Quick Demo Sign-In</div>
          <div className="demo-grid">
            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleQuickFill('admin@controltower.io', 'Admin123!')}
            >
              <Shield size={14} color="var(--accent-violet)" style={{ marginBottom: '4px' }} />
              <span className="demo-pill-role">Admin</span>
              <span className="demo-pill-desc">Full Control</span>
            </button>

            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleQuickFill('operator@controltower.io', 'Operator123!')}
            >
              <UserCheck size={14} color="var(--accent-cyan)" style={{ marginBottom: '4px' }} />
              <span className="demo-pill-role">Operator</span>
              <span className="demo-pill-desc">HITL Approval</span>
            </button>

            <button
              type="button"
              className="demo-pill-btn"
              onClick={() => handleQuickFill('viewer@controltower.io', 'Viewer123!')}
            >
              <Eye size={14} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
              <span className="demo-pill-role">Viewer</span>
              <span className="demo-pill-desc">Read Only</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
