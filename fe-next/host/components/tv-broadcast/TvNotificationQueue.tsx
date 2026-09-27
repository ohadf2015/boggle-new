'use client';

import { memo, useCallback, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import TvNotification, { TvNotificationData } from './TvNotification';

interface TvNotificationQueueProps {
  notifications: TvNotificationData[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
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

  return (
    <div className="fixed inset-x-0 bottom-8 pointer-events-none z-50 flex justify-center">
      <div className="relative">
        <AnimatePresence mode="wait">
          {visibleNotifications.map((notification) => (
            <TvNotification
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

TvNotificationQueue.displayName = 'TvNotificationQueue';

export default TvNotificationQueue;
