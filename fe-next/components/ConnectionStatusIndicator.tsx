'use client';

import React, { useState, useMemo } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Connection status type for better semantics
 */
type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

/**
 * Status configuration for consistent styling
 */
const STATUS_STYLE_CONFIG: Record<ConnectionStatus, {
  className: string;
  icon: string;
}> = {
  connected: {
    className: 'connection-indicator--connected',
    icon: '✓',
  },
  connecting: {
    className: 'connection-indicator--connecting',
    icon: '...',
  },
  reconnecting: {
    className: 'connection-indicator--reconnecting',
    icon: '↻',
  },
  disconnected: {
    className: 'connection-indicator--disconnected',
    icon: '✗',
  },
};

/**
 * Hook to get translated status labels and descriptions
 */
function useStatusConfig(t: (key: string) => string) {
  return useMemo(() => ({
    connected: {
      ...STATUS_STYLE_CONFIG.connected,
      label: t('common.connected'),
      description: t('common.connectedToServer'),
    },
    connecting: {
      ...STATUS_STYLE_CONFIG.connecting,
      label: t('common.connecting'),
      description: t('common.connectingToServer'),
    },
    reconnecting: {
      ...STATUS_STYLE_CONFIG.reconnecting,
      label: t('common.reconnecting'),
      description: t('common.reconnecting'),
    },
    disconnected: {
      ...STATUS_STYLE_CONFIG.disconnected,
      label: t('common.notConnected'),
      description: t('common.notConnected'),
    },
  }), [t]);
}

/**
 * Minimal connection dot (just the indicator, no tooltip)
 * Shows prominently during initial connection, then hides when connected.
 * Shows again if connection issues occur.
 */
export const ConnectionDot: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, isReconnecting, connectionError } = useSocket();
  const { t } = useLanguage();
  const statusConfig = useStatusConfig(t);

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();

  // Only show indicator when there's a problem - don't show green dot for normal operation
  if (status === 'connected') {
    return null;
  }

  const config = statusConfig[status];
  const showExpandedState = status === 'connecting' || status === 'reconnecting';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'fixed top-2 left-1/2 -translate-x-1/2 z-[9998]',
          'flex items-center gap-2',
          'px-3 py-1.5 rounded-full',
          'border-2 border-neo-black shadow-hard-sm',
          status === 'connecting' && 'bg-neo-yellow',
          status === 'reconnecting' && 'bg-neo-yellow',
          status === 'disconnected' && 'bg-neo-red',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={config.label}
      >
        {/* Pulsing dot */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            status === 'disconnected' ? 'bg-neo-cream' : 'bg-neo-black'
          )}
        />

        {/* Status text */}
        <span className={cn(
          'text-xs font-bold uppercase tracking-wide',
          status === 'disconnected' ? 'text-neo-cream' : 'text-neo-black'
        )}>
          {showExpandedState ? (
            <>
              {status === 'reconnecting' ? t('common.reconnecting') : t('common.connecting')}
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </motion.span>
            </>
          ) : (
            config.label
          )}
        </span>
      </motion.div>
    </AnimatePresence>
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
  const { t } = useLanguage();
  const statusConfig = useStatusConfig(t);
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();
  const config = statusConfig[status];

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
          status === 'reconnecting' && 'bg-neo-yellow animate-pulse',
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
            status === 'reconnecting' && 'text-neo-yellow',
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

/**
 * Connection Banner - Fixed banner shown when disconnected
 * Shows reconnection progress and manual retry button
 */
interface ConnectionBannerProps {
  className?: string;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ className }) => {
  const {
    isConnected,
    isReconnecting,
    connectionError,
    reconnectAttempt,
    maxReconnectAttempts,
    manualReconnect
  } = useSocket();
  const { t } = useLanguage();

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();

  // Don't show banner when connected
  if (status === 'connected') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          'bg-neo-red border-b-4 border-neo-black',
          'shadow-hard-lg',
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Status message */}
            <div className="flex items-center gap-3">
              {/* Pulsing indicator */}
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={cn(
                    'w-4 h-4 rounded-full border-2 border-neo-black',
                    status === 'reconnecting' && 'bg-neo-yellow',
                    status === 'disconnected' && 'bg-neo-red',
                    status === 'connecting' && 'bg-neo-yellow'
                  )}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-neo-white font-bold text-sm">
                  {status === 'reconnecting'
                    ? t('connection.reconnecting') || 'Reconnecting...'
                    : t('connection.disconnected') || 'Connection Lost'
                  }
                </span>

                {/* Progress indicator */}
                {status === 'reconnecting' && reconnectAttempt > 0 && (
                  <span className="text-neo-white/80 text-xs">
                    {t('connection.attempt') || 'Attempt'} {reconnectAttempt}/{maxReconnectAttempts}
                  </span>
                )}

                {status === 'disconnected' && connectionError && (
                  <span className="text-neo-white/80 text-xs">
                    {t('connection.checkConnection') || 'Check your internet connection'}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar (for reconnecting) */}
            {status === 'reconnecting' && reconnectAttempt > 0 && (
              <div className="flex flex-1 max-w-[200px] items-center gap-2">
                <div className="flex-1 h-2 bg-neo-black/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-neo-lime"
                    initial={{ width: 0 }}
                    animate={{ width: `${(reconnectAttempt / maxReconnectAttempts) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Retry button */}
            <button
              onClick={manualReconnect}
              className={cn(
                'px-4 py-2 rounded-neo',
                'bg-neo-lime text-neo-black',
                'font-bold text-sm uppercase tracking-wide',
                'border-2 border-neo-black shadow-hard-sm',
                'hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px]',
                'active:shadow-none active:translate-x-[1px] active:translate-y-[1px]',
                'transition-all duration-100',
                'flex items-center gap-2'
              )}
              aria-label={t('connection.retry') || 'Retry connection'}
            >
              <motion.span
                animate={status === 'reconnecting' ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: status === 'reconnecting' ? Infinity : 0, ease: 'linear' }}
                className="text-base"
              >
                ↻
              </motion.span>
              <span>{t('connection.retryNow') || 'Retry Now'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;
