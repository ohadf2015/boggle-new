'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import TvNotification, { TvNotificationData } from './TvNotification';
import { TEACHER_CONTROLS_TOAST_OFFSET } from '@/components/education/controls/teacherBarInset';

interface TvNotificationQueueProps {
  notifications: TvNotificationData[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
  placement?: 'overlay' | 'inline';
}

// Minimum gap between notifications in milliseconds
const MIN_GAP_MS = 3500;

/**
 * TvNotificationQueue - Manages and displays notifications
 * - Bottom-center positioning (less intrusive)
 * - Enforces minimum gap between notifications
 * - Shows one notification at a time
 */
const TvNotificationQueue = memo<TvNotificationQueueProps>(({
  notifications,
  onDismiss,
  maxVisible = 1,
  placement = 'overlay',
}) => {
  const [isGapActive, setIsGapActive] = useState(false);
  const gapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle dismiss with gap enforcement
  const handleDismiss = useCallback((id: string) => {
    setIsGapActive(true);
    onDismiss(id);

    // Clear any existing timeout
    if (gapTimeoutRef.current) {
      clearTimeout(gapTimeoutRef.current);
    }

    // Re-enable after gap
    gapTimeoutRef.current = setTimeout(() => {
      setIsGapActive(false);
    }, MIN_GAP_MS);
  }, [onDismiss]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (gapTimeoutRef.current) {
        clearTimeout(gapTimeoutRef.current);
      }
    };
  }, []);

  // Only show notification if gap has passed
  const shouldShow = !isGapActive && notifications.length > 0;
  const visibleNotifications = shouldShow ? notifications.slice(0, maxVisible) : [];

  const compact = placement === 'inline';
  const toasts = (
    <AnimatePresence mode="wait">
      {visibleNotifications.map((notification) => (
        <TvNotification
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
          compact={compact}
        />
      ))}
    </AnimatePresence>
  );

  if (compact) {
    return (
      <div data-testid="tv-toast-inline" className="pointer-events-none flex min-w-0 max-w-full items-center justify-end">
        {toasts}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 pointer-events-none z-50 flex justify-center"
      style={TEACHER_CONTROLS_TOAST_OFFSET}
    >
      <div className="relative">{toasts}</div>
    </div>
  );
});

TvNotificationQueue.displayName = 'TvNotificationQueue';

export default TvNotificationQueue;
