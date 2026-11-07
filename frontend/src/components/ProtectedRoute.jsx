import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 500 }}>
          Verifying security credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <ShieldAlert size={64} color="var(--status-danger)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Access Denied (403 Forbidden)</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '1.5rem' }}>
          Your current account role <strong style={{ color: 'var(--text-primary)' }}>({user.role})</strong> does not have permission to view this module.
          Required role(s): {allowedRoles.join(', ')}.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          Return to Previous Page
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
