'use client';

import type { CSSProperties } from 'react';

interface Props {
  outcome: 'victory' | 'defeat';
  onRetry: () => void;
  onExit: () => void;
}

export function PostFightModal({ outcome, onRetry, onExit }: Props) {
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h1
          style={{
            fontSize: '64px',
            fontFamily: 'Fredoka, sans-serif',
            fontWeight: 700,
            color: outcome === 'victory' ? '#bfff00' : '#ef4444',
            marginBottom: 24,
            textShadow: '4px 4px 0 #000',
          }}
        >
          {outcome === 'victory' ? 'VICTORY' : 'DEFEAT'}
        </h1>
        <p style={{ color: 'white', fontSize: 18, marginBottom: 32, fontFamily: 'Rubik, sans-serif' }}>
          {outcome === 'victory'
            ? 'The enemy falls. Did spelling feel like a spell?'
            : 'You fell. Did spelling feel like a spell?'}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button type="button" onClick={onRetry} style={btnStyle('#bfff00', '#1a1a2e')}>
            Try Again
          </button>
          <button type="button" onClick={onExit} style={btnStyle('#ef4444', 'white')}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const cardStyle: CSSProperties = {
  background: '#1a1a2e',
  border: '4px solid #bfff00',
  padding: '48px',
  borderRadius: '16px',
  textAlign: 'center',
  boxShadow: '8px 8px 0 #000',
  maxWidth: '90vw',
};

const btnStyle = (bg: string, ink: string): CSSProperties => ({
  background: bg,
  color: ink,
  fontFamily: 'Fredoka, sans-serif',
  fontSize: 24,
  fontWeight: 'bold',
  padding: '12px 32px',
  border: '3px solid black',
  boxShadow: '4px 4px 0 black',
  cursor: 'pointer',
});
