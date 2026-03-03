'use client';

import React, { useState, useCallback, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnifiedAchievementModal } from './UnifiedAchievementModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAchievementIcon } from '@/constants/achievementIcons';
import type { AchievementPayload } from '@/shared/types/socket';
// NOTE: AchievementCinematic is available at ../cinematics/AchievementCinematic
// for GOLD/PLATINUM tiers. To integrate, extend AchievementPayload with `count`
// field, then use calculateTier() from @/utils/achievementTiers to determine
// whether to show CinematicPlayer vs UnifiedAchievementModal in processNext().

interface AchievementQueueProps {
  children: ReactNode | ((props: { queueAchievement: (achievement: AchievementPayload) => void }) => ReactNode);
}

interface AchievementQueueContextValue {
  queueAchievement: (achievement: AchievementPayload) => void;
}

const AchievementQueue = ({ children }: AchievementQueueProps): React.ReactElement => {
  const [queue, setQueue] = useState<AchievementPayload[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementPayload | null>(null);
  const isDisplayingRef = useRef<boolean>(false);
  const queueRef = useRef<AchievementPayload[]>([]);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process next achievement from queue
  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      setCurrentAchievement(null);
      return;
    }

    isDisplayingRef.current = true;
    const [next, ...rest] = queueRef.current;
    setQueue(rest);
    setCurrentAchievement(next ?? null);
  }, []);

  // Handle popup complete
  const handlePopupComplete = useCallback(() => {
    // Small delay between achievements
    setTimeout(() => {
      processNext();
    }, 500);
  }, [processNext]);

  // Queue a new achievement
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement) return;

    // Add to queue (max 5)
    setQueue(prev => {
      const newQueue = [...prev, achievement].slice(-5);
      return newQueue;
    });

    // If not currently displaying, start immediately
    if (!isDisplayingRef.current) {
      setTimeout(() => {
        if (!isDisplayingRef.current && queueRef.current.length > 0) {
          processNext();
        }
      }, 100);
    }
  }, [processNext]);

  // Expose queueAchievement through children render prop or context
  return (
    <>
      {typeof children === 'function' ? children({ queueAchievement }) : children}
      {currentAchievement && (
        <UnifiedAchievementModal
          type="socket"
          achievement={currentAchievement}
          onClose={handlePopupComplete}
        />
      )}
    </>
  );
};

export default AchievementQueue;

// Also export a hook-friendly context version
const AchievementQueueContext = createContext<AchievementQueueContextValue | null>(null);

interface AchievementQueueProviderProps {
  children: ReactNode;
}

// Auto-dismiss duration for inline achievement toast (ms)
// Short enough to not distract during fast-paced multiplayer gameplay
const INLINE_TOAST_DURATION = 2000;
// Delay between consecutive achievement toasts (ms)
const INLINE_TOAST_GAP = 400;

/**
 * AchievementInlineToast - Compact achievement notification for multiplayer
 *
 * Shows achievement icon (from ACHIEVEMENT_ICONS), translated name, and
 * description. Non-intrusive, fixed to top of screen.
 */
function AchievementInlineToast({
  achievement,
  onDismiss,
}: {
  achievement: AchievementPayload;
  onDismiss: () => void;
}) {
  const { t, dir } = useLanguage();
  const isRtl = dir === 'rtl';

  const icon = getAchievementIcon(achievement.key);
  const name = t(`achievements.${achievement.key}.name`) || achievement.key;
  const description = t(`achievements.${achievement.key}.description`) || '';

  // Auto-dismiss after timeout
  useEffect(() => {
    const timer = setTimeout(onDismiss, INLINE_TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      data-testid="achievement-inline-toast"
      initial={{ y: -60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-navy pointer-events-auto"
      style={{
        boxShadow: isRtl
          ? '-4px 4px 0px #FFE135'
          : '4px 4px 0px #FFE135',
        minWidth: '280px',
        maxWidth: '420px',
      }}
    >
      {/* Achievement Icon */}
      <div
        data-testid="achievement-inline-icon"
        className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow shrink-0"
      >
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Text Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs font-bold uppercase tracking-wide text-neo-white/70">
          {t('achievements.unlocked') || 'Achievement Unlocked!'}
        </span>
        <span
          data-testid="achievement-inline-name"
          className="font-black text-lg truncate text-neo-lime"
        >
          {name}
        </span>
        {description && (
          <span className="text-xs text-neo-white/60 truncate">
            {description}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * AchievementQueueProvider - Global provider for socket-based achievements
 *
 * Shows ONE achievement at a time as a compact inline toast with icon,
 * name, and description. Queues multiple achievements sequentially.
 *
 * For contexts where modals ARE appropriate (education mode, adventure mode,
 * single-player results), use UnifiedAchievementModal directly.
 */
export const AchievementQueueProvider = ({ children }: AchievementQueueProviderProps): React.ReactElement => {
  const [queue, setQueue] = useState<AchievementPayload[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementPayload | null>(null);
  const isDisplayingRef = useRef<boolean>(false);
  const queueRef = useRef<AchievementPayload[]>([]);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process next achievement from queue
  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      setCurrentAchievement(null);
      return;
    }

    isDisplayingRef.current = true;
    const [next, ...rest] = queueRef.current;
    setQueue(rest);
    setCurrentAchievement(next ?? null);
  }, []);

  // Handle toast dismiss — wait a gap, then show next
  const handleDismiss = useCallback(() => {
    setCurrentAchievement(null);
    setTimeout(() => {
      processNext();
    }, INLINE_TOAST_GAP);
  }, [processNext]);

  // Queue a new achievement (max 5)
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement) return;

    setQueue(prev => [...prev, achievement].slice(-5));

    // If not currently displaying, start immediately
    if (!isDisplayingRef.current) {
      setTimeout(() => {
        if (!isDisplayingRef.current && queueRef.current.length > 0) {
          processNext();
        }
      }, 100);
    }
  }, [processNext]);

  return (
    <AchievementQueueContext.Provider value={{ queueAchievement }}>
      {children}
      <AnimatePresence>
        {currentAchievement && (
          <AchievementInlineToast
            key={currentAchievement.key}
            achievement={currentAchievement}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </AchievementQueueContext.Provider>
  );
};

export const useAchievementQueue = (): AchievementQueueContextValue => {
  const context = useContext(AchievementQueueContext);
  if (!context) {
    throw new Error('useAchievementQueue must be used within AchievementQueueProvider');
  }
  return context;
};
