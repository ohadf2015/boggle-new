/**
 * LiveActivityIndicator Component
 *
 * Real-time activity indicator showing connection status and active student count.
 * Displays pulsing dot when students are actively practicing.
 *
 * @example
 * <LiveActivityIndicator
 *   isConnected={true}
 *   activeStudentsCount={3}
 *   lastUpdate={new Date()}
 *   connectionStatus="connected"
 * />
 */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface LiveActivityIndicatorProps {
  /** Whether currently connected to realtime */
  isConnected: boolean;
  /** Count of active students */
  activeStudentsCount: number;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// ============================================
// COMPONENT
// ============================================

export function LiveActivityIndicator({
  isConnected,
  activeStudentsCount,
  lastUpdate,
  connectionStatus,
}: LiveActivityIndicatorProps) {
  const { t } = useLanguage();

  // ==================== STATUS DISPLAY ====================

  let statusText: string;
  let statusColor: string;
  let dotColor: string;
  let shouldPulse = false;

  switch (connectionStatus) {
    case 'connected':
      if (activeStudentsCount > 0) {
        statusText = t('education.analytics.live');
        statusColor = 'text-neo-cyan';
        dotColor = 'bg-neo-cyan';
        shouldPulse = true;
      } else {
        statusText = t('education.analytics.live');
        statusColor = 'text-neo-white/70';
        dotColor = 'bg-green-500';
        shouldPulse = false;
      }
      break;

    case 'connecting':
      statusText = t('education.analytics.connecting');
      statusColor = 'text-neo-yellow';
      dotColor = 'bg-neo-yellow';
      shouldPulse = false;
      break;

    case 'error':
      statusText = t('education.analytics.connectionError');
      statusColor = 'text-neo-orange';
      dotColor = 'bg-neo-orange';
      shouldPulse = false;
      break;

    case 'disconnected':
    default:
      statusText = t('education.analytics.offline');
      statusColor = 'text-neo-white/50';
      dotColor = 'bg-gray-500';
      shouldPulse = false;
      break;
  }

  // ==================== ACTIVITY TEXT ====================

  let activityText: string;
  if (connectionStatus === 'connected') {
    if (activeStudentsCount > 0) {
      activityText = t('education.analytics.activeNow', { count: activeStudentsCount });
    } else {
      activityText = t('education.analytics.noActivity');
    }
  } else {
    activityText = '';
  }

  // ==================== LAST UPDATE ====================

  const getTimeAgo = (date: Date | null): string => {
    if (!date) return '';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 10) return t('education.analytics.updatedAgo', { time: 'just now' });
    if (seconds < 60) return t('education.analytics.updatedAgo', { time: `${seconds}s` });

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('education.analytics.updatedAgo', { time: `${minutes}m` });

    const hours = Math.floor(minutes / 60);
    return t('education.analytics.updatedAgo', { time: `${hours}h` });
  };

  const lastUpdateText = getTimeAgo(lastUpdate);

  // ==================== RENDER ====================

  return (
    <div className="inline-flex items-center gap-2" data-testid="live-activity-indicator">
      {/* Status Dot */}
      <div className="relative">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            dotColor,
            shouldPulse && 'animate-pulse'
          )}
        />
      </div>

      {/* Status Text */}
      <div className="flex flex-col">
        <span className={cn('text-sm font-neo-body', statusColor)}>
          {statusText}
        </span>

        {/* Activity/Last Update */}
        {activityText && (
          <span className="text-xs text-neo-white/60 font-neo-body">
            {activityText}
            {lastUpdateText && ` • ${lastUpdateText}`}
          </span>
        )}
      </div>
    </div>
  );
}

export default LiveActivityIndicator;
