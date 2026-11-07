import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

const SimulatedBanner = ({ isVisible = true, message = 'SIMULATED DEMO DATA: Currently displaying synthetic agent telemetry and simulated workflow events.' }) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)',
        borderBottom: '1px solid rgba(249, 115, 22, 0.3)',
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: '#fb923c',
        fontWeight: 500,
        zIndex: 50
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertTriangle size={15} color="#f97316" />
        <span>{message}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', opacity: 0.9 }}>
        <Info size={13} />
        <span>Strict isolation: Non-production sandbox</span>
      </div>
    </div>
  );
};

export default SimulatedBanner;
