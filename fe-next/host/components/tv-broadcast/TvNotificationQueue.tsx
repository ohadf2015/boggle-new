'use client';

import React, { memo, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import TvNotification, { TvNotificationData } from './TvNotification';

interface TvNotificationQueueProps {
  notifications: TvNotificationData[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

/**
 * TvNotificationQueue - Manages and displays notifications
 * Shows one notification at a time (queue the rest)
 */
const TvNotificationQueue = memo<TvNotificationQueueProps>(({
  notifications,
  onDismiss,
  maxVisible = 1,
}) => {
  const handleDismiss = useCallback((id: string) => {
    onDismiss(id);
  }, [onDismiss]);

  // Only show the most recent notification(s)
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
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

      {/* Queue indicator (shows how many are waiting) */}
      {notifications.length > maxVisible && (
        <div className="absolute bottom-4 right-4 bg-neo-black/80 text-neo-cream px-3 py-1 rounded-full text-sm font-bold">
          +{notifications.length - maxVisible} more
        </div>
      )}
    </div>
  );
});

TvNotificationQueue.displayName = 'TvNotificationQueue';

export default TvNotificationQueue;
