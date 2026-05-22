'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSocket } from '@/utils/SocketContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from 'framer-motion';
import { connectionBannerCopy } from '@/utils/connectionBannerCopy';

/**
 * Graduated reconnection UX delay.
 * Brief disconnections (< 1.5s) are silent — most mobile cellular handoffs
 * resolve within 1-3 seconds. Lower than the prior 5s threshold so users on
 * a real handoff see feedback well before the device feels frozen, while
 * sub-second blips (typical socket retransmits) still don't flash a banner.
 * See audit UX-CRIT-4 (multiplayer-comprehensive-audit-2026-04-27).
 */
const BANNER_DELAY_MS = 1500;

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

  // Problem-only indicator. Surfacing the healthy ('connected') and initial
  // ('connecting') states is redundant noise in the lobby — the user can see
  // the rooms loaded. Only genuine trouble (reconnecting / disconnected) shows.
  if (status === 'connected' || status === 'connecting') {
    return null;
  }

  const config = statusConfig[status];
  const showExpandedState = status === 'reconnecting';

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          'fixed top-2 left-1/2 -translate-x-1/2 z-9998',
          'flex items-center gap-2',
          'px-3 py-1.5 rounded-full',
          'border-2 border-neo-black shadow-hard-sm',
          status === 'reconnecting' && 'bg-neo-cream',
          status === 'disconnected' && 'bg-neo-red',
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={config.label}
      >
        {/* Pulsing dot */}
        <m.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ type: 'tween', duration: 1, repeat: Infinity, ease: 'easeInOut' }}
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
              {t('common.reconnecting')}
              <m.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ...
              </m.span>
            </>
          ) : (
            config.label
          )}
        </span>
      </m.div>
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
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
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
          status === 'connecting' && 'bg-neo-cream animate-pulse',
          status === 'reconnecting' && 'bg-neo-cream animate-pulse',
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
            status === 'connecting' && 'text-neo-cream',
            status === 'reconnecting' && 'text-neo-cream',
            status === 'disconnected' && 'text-neo-red'
          )}
        >
          {config.label}
        </span>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <m.div
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
          </m.div>
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
  /** Show "Your score is safe" reassurance during active game */
  showScoreSafe?: boolean;
  /** Callback to leave the game — shown as escape hatch when reconnection is failing */
  onLeaveGame?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ className, showScoreSafe, onLeaveGame }) => {
  const {
    isConnected,
    isReconnecting,
    isServerUpdating,
    connectionError,
    getReconnectAttempt,
    maxReconnectAttempts,
    manualReconnect
  } = useSocket();
  const reconnectAttempt = getReconnectAttempt();
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStatus = (): ConnectionStatus => {
    if (isConnected) return 'connected';
    if (isReconnecting) return 'reconnecting';
    if (connectionError) return 'disconnected';
    return 'connecting';
  };

  const status = getStatus();
  const copy = connectionBannerCopy(status, !!isServerUpdating);

  // Graduated UX: delay banner appearance to avoid anxiety during brief drops.
  // Phase 1 (0-5s): Silent reconnection — most mobile dropouts resolve here.
  // Phase 2 (5s+): Show full banner with progress and retry button.
  useEffect(() => {
    if (status === 'connected') {
      // Immediately hide on reconnect
      setShowBanner(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start delay timer when disconnected
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setShowBanner(true);
        timerRef.current = null;
      }, BANNER_DELAY_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // Don't show banner when connected or during silent grace period
  if (status === 'connected' || !showBanner) {
    return null;
  }

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          // Calm tone for a planned deploy; alarm-red only for a real drop.
          copy.isUpdate ? 'bg-neo-cyan' : 'bg-neo-red',
          'border-b-4 border-neo-black',
          'shadow-hard-lg',
          className
        )}
        role={copy.isUpdate ? 'status' : 'alert'}
        aria-live={copy.isUpdate ? 'polite' : 'assertive'}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Status message */}
            <div className="flex items-center gap-3">
              {/* Pulsing indicator */}
              <div className="relative">
                <m.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ type: 'tween', duration: 1.5, repeat: Infinity }}
                  className={cn(
                    'w-4 h-4 rounded-full border-2 border-neo-black',
                    status === 'reconnecting' && 'bg-neo-cream',
                    status === 'disconnected' && 'bg-neo-red',
                    status === 'connecting' && 'bg-neo-cream'
                  )}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <span className={cn('font-bold text-sm', copy.isUpdate ? 'text-neo-black' : 'text-neo-white')}>
                  {t(copy.titleKey)}
                </span>

                {/* Reassuring hint during a planned deploy */}
                {copy.isUpdate && copy.subtitleKey && (
                  <span className="text-neo-black/80 text-xs font-bold">
                    {t(copy.subtitleKey)}
                  </span>
                )}

                {/* Progress indicator */}
                {!copy.isUpdate && status === 'reconnecting' && reconnectAttempt > 0 && (
                  <span className="text-neo-white/80 text-xs">
                    {t('connection.attempt')} {reconnectAttempt}/{maxReconnectAttempts}
                  </span>
                )}

                {status === 'disconnected' && connectionError && (
                  <span className="text-neo-white/80 text-xs">
                    {t('connection.checkConnection')}
                  </span>
                )}

                {/* Reassurance during active game */}
                {showScoreSafe && (
                  <span className="text-neo-lime/90 text-xs font-bold">
                    {t('connection.scoreSafe')}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar (for reconnecting) */}
            {status === 'reconnecting' && reconnectAttempt > 0 && (
              <div className="flex flex-1 max-w-[200px] items-center gap-2">
                <div className="flex-1 h-2 bg-neo-black/30 rounded-full overflow-hidden">
                  <m.div
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
                'hover:shadow-hard hover:-translate-x-px hover:-translate-y-px',
                'active:shadow-none active:translate-x-px active:translate-y-px',
                'transition-all duration-100',
                'flex items-center gap-2'
              )}
              aria-label={t('connection.retry')}
            >
              <m.span
                animate={status === 'reconnecting' ? { rotate: 360 } : {}}
                transition={{ duration: 1, repeat: status === 'reconnecting' ? Infinity : 0, ease: 'linear' }}
                className="text-base"
              >
                ↻
              </m.span>
              <span>{t('connection.retryNow')}</span>
            </button>

            {/* Leave Game escape hatch — visible after 3+ failed attempts */}
            {onLeaveGame && reconnectAttempt >= 3 && (
              <button
                onClick={onLeaveGame}
                className={cn(
                  'px-4 py-2 rounded-neo',
                  'bg-neo-black/50 text-neo-white/80',
                  'font-bold text-xs uppercase tracking-wide',
                  'border-2 border-neo-white/20',
                  'hover:bg-neo-black/70 hover:text-neo-white',
                  'transition-all duration-100'
                )}
              >
                {t('adventure.leaveGame')}
              </button>
            )}
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;
