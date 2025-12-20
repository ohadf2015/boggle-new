'use client';

import React from 'react';
import { useSocket } from '@/utils/SocketContext';
import { cn } from '@/lib/utils';

/**
 * Minimal connection dot (just the indicator, no tooltip)
 */
export const ConnectionDot: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, isReconnecting, connectionError } = useSocket();

  const getStateClass = () => {
    if (isConnected) return 'connection-indicator--connected';
    if (isReconnecting) return 'connection-indicator--reconnecting';
    if (connectionError) return 'connection-indicator--disconnected';
    return 'connection-indicator--connecting';
  };

  return (
    <div
      className={cn('connection-indicator', getStateClass(), className)}
      role="status"
      aria-label={`Connection: ${isConnected ? 'connected' : 'disconnected'}`}
    />
  );
};

// Default export removed - use named exports (ConnectionDot) instead
