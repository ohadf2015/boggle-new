'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/utils/SocketContext';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/utils/accessibility';

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

interface ConnectionStatusIndicatorProps {
  /** Show expanded status on hover/tap */
  showLabel?: boolean;
  /** Position of the indicator */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Additional className */
  className?: string;
}

/**
 * ConnectionStatusIndicator
 * Visual indicator showing real-time connection status
 * Uses CSS classes from globals.css for consistent styling
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showLabel = false,
  position = 'top-right',
  className,
}) => {
  const { isConnected, isReconnecting, connectionError } = useSocket();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);

  // Determine connection state
  const getConnectionState = (): ConnectionState => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const connectionState = getConnectionState();

  // Check for reduced motion preference
  useEffect(() => {
    setHasReducedMotion(prefersReducedMotion());
  }, []);

  // Position styles
  const positionStyles: Record<string, string> = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
  };

  // Status labels
  const statusLabels: Record<ConnectionState, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting...',
  };

  // Don't render anything if connected and not hovering (minimal UI)
  // Actually, let's always show a subtle indicator for UX transparency

  return (
    <div
      className={cn(
        'fixed z-[9998] flex items-center gap-2',
        positionStyles[position],
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(prev => !prev)}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${statusLabels[connectionState]}`}
    >
      {/* Status dot */}
      <motion.div
        className={cn(
          'w-3 h-3 rounded-full border-2 border-neo-black',
          connectionState === 'connected' && 'bg-neo-lime',
          connectionState === 'connecting' && 'bg-neo-yellow',
          connectionState === 'disconnected' && 'bg-neo-red',
          connectionState === 'reconnecting' && 'bg-neo-orange'
        )}
        animate={
          !hasReducedMotion && (connectionState === 'connecting' || connectionState === 'reconnecting')
            ? {
                scale: [1, 0.9, 1],
                opacity: [1, 0.6, 1],
              }
            : {}
        }
        transition={{
          duration: connectionState === 'reconnecting' ? 0.5 : 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Expandable label */}
      <AnimatePresence>
        {(showLabel || showTooltip) && (
          <motion.div
            initial={{ opacity: 0, x: -10, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -10, width: 0 }}
            transition={{ duration: hasReducedMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <span
              className={cn(
                'text-xs font-bold uppercase whitespace-nowrap px-2 py-1 rounded-neo border-2 border-neo-black',
                connectionState === 'connected' && 'bg-neo-lime text-neo-black',
                connectionState === 'connecting' && 'bg-neo-yellow text-neo-black',
                connectionState === 'disconnected' && 'bg-neo-red text-neo-white',
                connectionState === 'reconnecting' && 'bg-neo-orange text-neo-black'
              )}
            >
              {statusLabels[connectionState]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {connectionError && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 max-w-xs"
          >
            <div className="bg-neo-red text-neo-white text-xs p-2 rounded-neo border-2 border-neo-black shadow-hard-sm">
              {connectionError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

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

export default ConnectionStatusIndicator;
