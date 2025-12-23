'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  comboLevel?: number;
  className?: string;
  compact?: boolean;
}

const NOTIFICATION_DURATION = 2000; // ms

/**
 * GameNotificationArea - Dedicated area for word validation feedback and combo display
 * Takes permanent space in the layout, doesn't overlap the game board
 */
const GameNotificationArea: React.FC<GameNotificationAreaProps> = ({
  notification,
  comboLevel = 0,
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

  const showCombo = comboLevel > 1 && !visibleNotification;

  return (
    <div
      className={cn(
        'w-full flex items-center justify-center',
        compact ? 'h-8 min-h-[32px]' : 'h-10 min-h-[40px]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {visibleNotification ? (
          <motion.div
            key={`notification-${visibleNotification.id}`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'flex items-center gap-2 rounded-neo border-2 border-neo-black shadow-hard-sm whitespace-nowrap',
              compact ? 'px-2 py-1' : 'px-3 py-1.5',
              visibleNotification.type === 'accepted' && 'bg-neo-lime',
              visibleNotification.type === 'rejected' && 'bg-neo-red text-neo-cream',
              visibleNotification.type === 'pending' && 'bg-neo-yellow',
              visibleNotification.type === 'combo' && 'bg-neo-cyan'
            )}
          >
            {/* Word accepted */}
            {visibleNotification.type === 'accepted' && (
              <>
                <span className="text-neo-lime-dark">✓</span>
                <span className={cn('font-black uppercase', compact ? 'text-sm' : 'text-base')}>
                  {visibleNotification.word}
                </span>
                {visibleNotification.score !== undefined && (
                  <span className={cn(
                    'bg-neo-cyan text-neo-black font-bold rounded px-1.5',
                    compact ? 'text-xs' : 'text-sm'
                  )}>
                    +{visibleNotification.score}
                  </span>
                )}
                {visibleNotification.comboBonus !== undefined && visibleNotification.comboBonus > 0 && (
                  <span className={cn(
                    'bg-neo-orange text-neo-black font-bold rounded px-1.5',
                    compact ? 'text-xs' : 'text-sm'
                  )}>
                    +{visibleNotification.comboBonus}
                  </span>
                )}
                {visibleNotification.fireRoundActive && (
                  <span className={cn(
                    'bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded px-1.5',
                    compact ? 'text-xs' : 'text-sm'
                  )}>
                    2x
                  </span>
                )}
              </>
            )}

            {/* Word rejected */}
            {visibleNotification.type === 'rejected' && (
              <>
                <span>✗</span>
                <span className={cn('font-bold', compact ? 'text-xs' : 'text-sm')}>
                  {visibleNotification.message || 'Not valid'}
                </span>
              </>
            )}

            {/* Word pending validation */}
            {visibleNotification.type === 'pending' && (
              <>
                <span className="animate-pulse">⏳</span>
                <span className={cn('font-bold', compact ? 'text-xs' : 'text-sm')}>
                  {visibleNotification.word} - Pending
                </span>
              </>
            )}
          </motion.div>
        ) : showCombo ? (
          <motion.div
            key="combo-indicator"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'flex items-center gap-2 bg-neo-cyan border-2 border-neo-black rounded-neo shadow-hard-sm',
              compact ? 'px-2 py-0.5' : 'px-3 py-1'
            )}
          >
            <span className={compact ? 'text-sm' : 'text-base'}>🔥</span>
            <span className={cn('font-black text-neo-black', compact ? 'text-sm' : 'text-lg')}>
              x{comboLevel}
            </span>
            <span className={cn('font-bold uppercase text-neo-black/70', compact ? 'text-xs' : 'text-xs')}>
              Combo
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'text-neo-black/30 font-medium uppercase tracking-wide',
              compact ? 'text-xs' : 'text-xs'
            )}
          >
            {/* Empty placeholder - maintains height */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameNotificationArea;
