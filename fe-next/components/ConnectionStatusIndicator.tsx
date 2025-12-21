'use client';

import React, { useState } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Connection status type for better semantics
 */
type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

/**
 * Status configuration for consistent styling and messaging
 */
const STATUS_CONFIG: Record<ConnectionStatus, {
  className: string;
  label: string;
  description: string;
  icon: string;
}> = {
  connected: {
    className: 'connection-indicator--connected',
    label: 'Connected',
    description: 'Connected to game server',
    icon: '✓',
  },
  connecting: {
    className: 'connection-indicator--connecting',
    label: 'Connecting',
    description: 'Connecting to game server...',
    icon: '...',
  },
  reconnecting: {
    className: 'connection-indicator--reconnecting',
    label: 'Reconnecting',
    description: 'Connection lost, reconnecting...',
    icon: '↻',
  },
  disconnected: {
    className: 'connection-indicator--disconnected',
    label: 'Disconnected',
    description: 'Not connected to game server',
    icon: '✗',
  },
};

/**
 * Minimal connection dot (just the indicator, no tooltip)
 */
export const ConnectionDot: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, isReconnecting, connectionError } = useSocket();

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn('connection-indicator', config.className, className)}
      role="status"
      aria-label={`Connection: ${config.label}`}
    />
  );
};

/**
 * Enhanced connection status with text label and tooltip
 * Shows connection state with color-coded dot + text for accessibility
 */
interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className,
  showLabel = true,
  compact = false,
}) => {
  const { isConnected, isReconnecting, connectionError } = useSocket();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();
  const config = STATUS_CONFIG[status];

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-2 px-2 py-1 rounded-neo',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="status"
      aria-label={config.description}
    >
      {/* Connection dot */}
      <div
        className={cn(
          'w-3 h-3 rounded-full border-2 border-neo-black',
          'transition-all duration-300',
          status === 'connected' && 'bg-neo-lime',
          status === 'connecting' && 'bg-neo-yellow animate-pulse',
          status === 'reconnecting' && 'bg-neo-orange animate-pulse',
          status === 'disconnected' && 'bg-neo-red'
        )}
        aria-hidden="true"
      />

      {/* Text label */}
      {showLabel && !compact && (
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            status === 'connected' && 'text-neo-lime',
            status === 'connecting' && 'text-neo-yellow',
            status === 'reconnecting' && 'text-neo-orange',
            status === 'disconnected' && 'text-neo-red'
          )}
        >
          {config.label}
        </span>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50',
              'px-3 py-2 rounded-neo',
              'bg-neo-cream text-neo-black',
              'border-2 border-neo-black shadow-hard-sm',
              'text-xs font-bold whitespace-nowrap'
            )}
            role="tooltip"
          >
            {/* Tooltip arrow */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neo-cream border-l-2 border-t-2 border-neo-black rotate-45"
              aria-hidden="true"
            />
            <span className="relative z-10">{config.description}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectionStatus;
