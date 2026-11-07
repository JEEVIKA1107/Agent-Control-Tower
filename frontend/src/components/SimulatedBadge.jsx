import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const SimulatedBadge = ({ source = 'live', size = 'sm' }) => {
  const isSimulated = source === 'simulated';

  return (
    <span
      className={`badge ${isSimulated ? 'badge-simulated' : 'badge-live'}`}
      style={{
        fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
        padding: size === 'sm' ? '0.15rem 0.45rem' : '0.25rem 0.6rem'
      }}
      title={isSimulated ? 'This is simulated demo telemetry data' : 'Verified live production event'}
    >
      {isSimulated ? (
        <>
          <AlertCircle size={12} style={{ marginRight: '3px' }} />
          SIMULATED
        </>
      ) : (
        <>
          <CheckCircle size={12} style={{ marginRight: '3px' }} />
          LIVE
        </>
      )}
    </span>
  );
};

export default SimulatedBadge;
