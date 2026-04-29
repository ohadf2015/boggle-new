'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { UnifiedAchievementModal } from './UnifiedAchievementModal';
import type { CinematicPlayerProps } from '../adventure/boss/cinematics/CinematicPlayer';

import { useLanguage } from '@/contexts/LanguageContext';
import { getAchievementIcon } from '@/constants/achievementIcons';
import { calculateTier, TIER_COLORS } from '@/utils/achievementTiers';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics/HapticsManager';
import type { AchievementPayload } from '@/shared/types/socket';

const CinematicPlayer = dynamic(
  () => import('../adventure/boss/cinematics/CinematicPlayer').then((m) => m.CinematicPlayer),
  { ssr: false }
) as React.ComponentType<CinematicPlayerProps>;

// Lazy-load AchievementCinematic to keep Remotion (~200KB) out of the initial bundle.
// It is only needed when a GOLD/PLATINUM achievement actually plays.
const AchievementCinematic = dynamic(
  () => import('./cinematics/AchievementCinematic').then((m) => ({ default: m.AchievementCinematic })),
  { ssr: false }
);

// Duration constant inlined to avoid importing the Remotion module at parse time.
const ACHIEVEMENT_DURATION_FRAMES = 210;

interface AchievementQueueProps {
  children: ReactNode | ((props: { queueAchievement: (achievement: AchievementPayload) => void }) => ReactNode);
}

interface AchievementQueueContextValue {
  queueAchievement: (achievement: AchievementPayload) => void;
}

const AchievementQueue = ({ children }: AchievementQueueProps): React.ReactElement => {
  const { t } = useLanguage();
  const [queue, setQueue] = useState<AchievementPayload[]>([]);
  const [currentAchievement, setCurrentAchievement] = useState<AchievementPayload | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);
  const isDisplayingRef = useRef<boolean>(false);
  const queueRef = useRef<AchievementPayload[]>([]);
  const timerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear all pending timeouts on unmount
  useEffect(() => {
    const timerIds = timerIdsRef.current;
    return () => {
      timerIds.forEach(id => clearTimeout(id));
      timerIds.clear();
    };
  }, []);

  // Keep queueRef in sync
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Process next achievement from queue
  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isDisplayingRef.current = false;
      setCurrentAchievement(null);
      setShowCinematic(false);
      return;
    }

    isDisplayingRef.current = true;
    const [next, ...rest] = queueRef.current;
    setQueue(rest);
    const achievement = next ?? null;
    setCurrentAchievement(achievement);

    // Show cinematic for GOLD/PLATINUM tiers
    const tier = achievement?.count ? calculateTier(achievement.count) : null;
    setShowCinematic(tier === 'GOLD' || tier === 'PLATINUM');
  }, []);

  // Handle popup complete
  const handlePopupComplete = useCallback(() => {
    setShowCinematic(false);
    // Small delay between achievements
    const id = setTimeout(() => {
      timerIdsRef.current.delete(id);
      processNext();
    }, 500);
    timerIdsRef.current.add(id);
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
      const id = setTimeout(() => {
        timerIdsRef.current.delete(id);
        if (!isDisplayingRef.current && queueRef.current.length > 0) {
          processNext();
        }
      }, 100);
      timerIdsRef.current.add(id);
    }
  }, [processNext]);

  // Build cinematic props for GOLD/PLATINUM
  const cinematicTier = currentAchievement?.count ? calculateTier(currentAchievement.count) : null;
  const isCinematicTier = cinematicTier === 'GOLD' || cinematicTier === 'PLATINUM';
  const tierColors = isCinematicTier ? TIER_COLORS[cinematicTier] : null;

  // Expose queueAchievement through children render prop or context
  return (
    <>
      {typeof children === 'function' ? children({ queueAchievement }) : children}
      {currentAchievement && showCinematic && isCinematicTier && tierColors && (
        <CinematicPlayer
          composition={AchievementCinematic as unknown as React.ComponentType<Record<string, unknown>>}
          compositionProps={{
            achievementName: t(`achievements.${currentAchievement.key}.name`) || currentAchievement.key,
            description: t(`achievements.${currentAchievement.key}.description`),
            icon: getAchievementIcon(currentAchievement.key),
            tier: cinematicTier,
            tierColor: tierColors.bg,
            tierGlow: tierColors.glow,
            tierLabel: t(`achievements.cinematic.${cinematicTier.toLowerCase()}`),
            unlockedText: t('achievements.cinematic.unlocked'),
          }}
          durationSeconds={ACHIEVEMENT_DURATION_FRAMES / 30}
          onComplete={handlePopupComplete}
          testId="achievement-cinematic"
        />
      )}
      {currentAchievement && !showCinematic && (
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
  const { t } = useLanguage();
  const { playAchievementSound } = useSoundEffects();

  const icon = getAchievementIcon(achievement.key);
  const name = t(`achievements.${achievement.key}.name`) || achievement.key;
  const description = t(`achievements.${achievement.key}.description`);

  useEffect(() => {
    playAchievementSound();
    haptics.success().catch(() => {});
    const timer = setTimeout(onDismiss, INLINE_TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [onDismiss, playAchievementSound]);

  // Uses inset-x-0 + flex centering instead of left-1/2 -translate-x-1/2
  // to avoid the element extending beyond viewport bounds, which gets
  // clipped by overflow-x:clip on body (screen-fit class)
  const toast = (
    <motion.div
      data-testid="achievement-inline-toast"
      initial={{ y: -60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="fixed inset-x-0 z-60 flex justify-center pointer-events-none px-4"
      style={{
        top: 'max(1rem, env(safe-area-inset-top, 1rem))',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-navy pointer-events-auto shadow-hard-yellow"
        style={{
          minWidth: 'min(280px, calc(100vw - 2rem))',
          maxWidth: 'min(420px, calc(100vw - 2rem))',
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
            {t('achievements.unlocked')}
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
      </div>
    </motion.div>
  );

  // Use portal to render at body level, escaping overflow constraints
  if (typeof document !== 'undefined') {
    return createPortal(toast, document.body);
  }
  return toast;
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
  const providerTimerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Clear all pending timeouts on unmount
  useEffect(() => {
    const providerTimerIds = providerTimerIdsRef.current;
    return () => {
      providerTimerIds.forEach(id => clearTimeout(id));
      providerTimerIds.clear();
    };
  }, []);

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
    const id = setTimeout(() => {
      providerTimerIdsRef.current.delete(id);
      processNext();
    }, INLINE_TOAST_GAP);
    providerTimerIdsRef.current.add(id);
  }, [processNext]);

  // Queue a new achievement (max 5)
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement) return;

    setQueue(prev => [...prev, achievement].slice(-5));

    // If not currently displaying, start immediately
    if (!isDisplayingRef.current) {
      const id = setTimeout(() => {
        providerTimerIdsRef.current.delete(id);
        if (!isDisplayingRef.current && queueRef.current.length > 0) {
          processNext();
        }
      }, 100);
      providerTimerIdsRef.current.add(id);
    }
  }, [processNext]);

  return (
    <AchievementQueueContext.Provider value={useMemo(() => ({ queueAchievement }), [queueAchievement])}>
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

const NOOP_QUEUE: AchievementQueueContextValue = { queueAchievement: () => {} };

export const useAchievementQueue = (): AchievementQueueContextValue => {
  const context = useContext(AchievementQueueContext);
  return context ?? NOOP_QUEUE;
};
