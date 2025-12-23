'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GameNotification {
  id: string;
  type: 'accepted' | 'rejected' | 'pending' | 'combo';
  word?: string;
  score?: number;
  comboLevel?: number;
  comboBonus?: number;
  fireRoundActive?: boolean;
  message?: string;
  timestamp: number;
}

interface GameNotificationAreaProps {
  notification: GameNotification | null;
  className?: string;
  compact?: boolean;
}

const NOTIFICATION_DURATION = 2000; // ms

/**
 * GameNotificationArea - Dedicated area for word validation feedback
 * Takes permanent space in the layout, shows accepted/rejected/pending word feedback
 */
const GameNotificationArea: React.FC<GameNotificationAreaProps> = ({
  notification,
  className,
  compact = false,
}) => {
  const [visibleNotification, setVisibleNotification] = useState<GameNotification | null>(null);

  // Handle new notifications
  useEffect(() => {
    if (!notification) return;

    setVisibleNotification(notification);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      setVisibleNotification(null);
    }, NOTIFICATION_DURATION);

    return () => clearTimeout(timer);
  }, [notification]);

  // Compact mode with no notification - take minimal space
  if (compact && !visibleNotification) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-7 min-w-[80px]',
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        compact ? 'h-7 min-h-[28px]' : 'w-full h-9 min-h-[36px]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {visibleNotification ? (
          <motion.div
            key={`notification-${visibleNotification.id}`}
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -3, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'flex items-center gap-1 rounded-neo border-2 border-neo-black shadow-hard-sm whitespace-nowrap',
              compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
              visibleNotification.type === 'accepted' && 'bg-neo-lime',
              visibleNotification.type === 'rejected' && 'bg-neo-red text-neo-cream',
              visibleNotification.type === 'pending' && 'bg-neo-yellow',
              visibleNotification.type === 'combo' && 'bg-neo-cyan'
            )}
          >
            {/* Word accepted */}
            {visibleNotification.type === 'accepted' && (
              <>
                <span className="text-neo-lime-dark text-xs">✓</span>
                <span className={cn('font-black uppercase text-neo-black', compact ? 'text-xs' : 'text-sm')}>
                  {visibleNotification.word}
                </span>
                {visibleNotification.score !== undefined && (
                  <span className={cn(
                    'bg-neo-cyan text-neo-black font-bold rounded px-1',
                    compact ? 'text-[10px]' : 'text-xs'
                  )}>
                    +{visibleNotification.score}
                  </span>
                )}
                {visibleNotification.fireRoundActive && (
                  <span className={cn(
                    'bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded px-1',
                    compact ? 'text-[10px]' : 'text-xs'
                  )}>
                    2x
                  </span>
                )}
              </>
            )}

            {/* Word rejected */}
            {visibleNotification.type === 'rejected' && (
              <>
                <span className="text-xs">✗</span>
                <span className={cn('font-bold', compact ? 'text-[10px]' : 'text-xs')}>
                  {visibleNotification.message || 'Not valid'}
                </span>
              </>
            )}

            {/* Word pending validation */}
            {visibleNotification.type === 'pending' && (
              <>
                <span className="animate-pulse text-xs">⏳</span>
                <span className={cn('font-bold text-neo-black', compact ? 'text-[10px]' : 'text-xs')}>
                  {visibleNotification.word}
                </span>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default GameNotificationArea;
