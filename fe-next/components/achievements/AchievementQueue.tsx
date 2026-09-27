'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Reveal } from '@/components/ui/Reveal';
import { UnifiedAchievementModal } from './UnifiedAchievementModal';
import type { CinematicPlayerProps } from '../adventure/boss/cinematics/CinematicPlayer';

import { useLanguage } from '@/contexts/LanguageContext';
import { getAchievementIcon } from '@/constants/achievementIcons';
import { calculateTier, TIER_COLORS, getTierToastStyle } from '@/utils/achievementTiers';
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
 * AchievementInlineToast - Narrow capsule achievement notification for multiplayer
 *
 * Shines + sparkles + pulsing yellow glow ring on icon. Non-intrusive, fixed
 * to top of screen. Capsule shape matches the single-player AchievementToast
 * for visual cohesion across surfaces.
 */
const INLINE_SPARKLE_OFFSETS: Array<{ x: number; y: number; delay: number; size: number }> = [
  { x: -16, y: -14, delay: 0.05, size: 10 },
  { x: 16, y: -10, delay: 0.18, size: 9 },
  { x: -12, y: 14, delay: 0.28, size: 8 },
  { x: 14, y: 14, delay: 0.36, size: 8 },
  { x: 0, y: -20, delay: 0.42, size: 7 },
  { x: 0, y: 20, delay: 0.5, size: 7 },
];

const DEFAULT_INLINE_GLOW = 'rgba(255, 225, 53, 0.55)';

function AchievementInlineToast({
  achievement,
  onDismiss,
}: {
  achievement: AchievementPayload;
  onDismiss: () => void;
}) {
  const { t, dir } = useLanguage();
  const { playAchievementSound } = useSoundEffects();

  const icon = getAchievementIcon(achievement.key);
  const name = t(`achievements.${achievement.key}.name`) || achievement.key;
  const isRtl = dir === 'rtl';

  // Tier-aware styling — falls back to a neutral yellow when count is absent
  // so the existing test contract (shadow-hard-yellow on default) still holds.
  const tier = achievement.count ? calculateTier(achievement.count) : null;
  const tierColors = tier ? TIER_COLORS[tier] : null;
  const tierStyle = getTierToastStyle(tier);
  const sparkles = INLINE_SPARKLE_OFFSETS.slice(0, tierStyle.sparkleCount);
  const iconBg = tierColors?.bg ?? 'var(--neo-yellow)';
  const sparkleColor = tierColors?.border ?? 'var(--neo-yellow)';
  const glow = tierColors?.glow ?? DEFAULT_INLINE_GLOW;

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
    <Reveal
      noSlide
      data-testid="achievement-inline-toast"
      className="fixed inset-x-0 z-60 flex justify-center pointer-events-none px-4"
      style={{
        top: 'max(1rem, env(safe-area-inset-top, 1rem))',
      }}
    >
      <div
        className={`relative flex items-center gap-2.5 px-3.5 py-2 rounded-full border-2 border-neo-black bg-neo-navy/95 pointer-events-auto ${tierStyle.shadowClass} overflow-hidden`}
        style={{
          minWidth: 'min(220px, calc(100vw - 2rem))',
          maxWidth: 'min(320px, calc(100vw - 2rem))',
        }}
      >
        {/* Shine sweep — rarer tiers run twice */}
        <m.div
          aria-hidden
          initial={{ x: isRtl ? 240 : -240, opacity: 0 }}
          animate={{ x: isRtl ? -240 : 240, opacity: [0, 0.85, 0] }}
          transition={{
            delay: 0.12,
            duration: 0.9,
            ease: 'easeOut',
            repeat: tierStyle.shineRepeat - 1,
            repeatDelay: 0.6,
          }}
          className="pointer-events-none absolute inset-y-0 w-24"
          style={{
            background: `linear-gradient(${isRtl ? '-75deg' : '75deg'}, transparent, ${glow}, transparent)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* Icon + glow ring + sparkles */}
        <div className="relative flex-shrink-0">
          <m.div
            animate={{
              boxShadow: [
                `0 0 0 0 ${glow}`,
                `0 0 0 ${tierStyle.pulseRadius}px transparent`,
                `0 0 0 0 ${glow}`,
              ],
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full"
            aria-hidden
          />
          <Reveal
            noSlide
            data-testid="achievement-inline-icon"
            className="relative w-9 h-9 flex items-center justify-center rounded-full border-2 border-neo-black"
            style={{ backgroundColor: iconBg }}
          >
            <m.span
              className="text-lg leading-none"
              animate={{ y: [0, -1.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {icon}
            </m.span>
          </Reveal>
          {sparkles.map((s, i) => (
            <m.span
              key={i}
              aria-hidden
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
              transition={{ delay: s.delay, duration: 0.9, ease: 'easeOut' }}
              className="absolute pointer-events-none select-none"
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(${s.x}px, ${s.y}px)`,
                fontSize: `${s.size}px`,
                color: sparkleColor,
                textShadow: `0 0 6px ${glow}`,
                lineHeight: 1,
              }}
            >
              ✦
            </m.span>
          ))}
        </div>

        {/* Text content */}
        <div className="relative flex flex-col flex-1 min-w-0 leading-tight">
          <Reveal
            as="span"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neo-white opacity-70"
          >
            <span>{t('achievements.unlocked')}</span>
            {tier && tierColors && tierStyle.showRarityBadge && (
              <Reveal
                as="span"
                noSlide
                className="px-1.5 py-px rounded-sm font-black tracking-wider"
                style={{
                  backgroundColor: tierColors.bg,
                  color: tierColors.text,
                  boxShadow: `0 0 6px ${tierColors.glow}`,
                }}
                data-testid="achievement-inline-rarity"
              >
                {tier}
              </Reveal>
            )}
          </Reveal>
          <Reveal
            as="span"
            data-testid="achievement-inline-name"
            className="font-black text-sm truncate text-neo-lime"
          >
            {name}
          </Reveal>
        </div>
      </div>
    </Reveal>
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

  // Track currently-displayed achievement key for dedupe (refs to avoid re-binding)
  const currentKeyRef = useRef<string | null>(null);
  useEffect(() => {
    currentKeyRef.current = currentAchievement?.key ?? null;
  }, [currentAchievement]);

  // Monotonic entry id so AnimatePresence remounts even when same key re-enters,
  // ensuring useEffect re-runs and a fresh auto-dismiss timer is scheduled.
  const entryIdRef = useRef(0);
  const [currentEntryId, setCurrentEntryId] = useState(0);
  useEffect(() => {
    if (currentAchievement) {
      entryIdRef.current += 1;
      setCurrentEntryId(entryIdRef.current);
    }
  }, [currentAchievement]);

  // Queue a new achievement (max 5, deduped by key)
  const queueAchievement = useCallback((achievement: AchievementPayload) => {
    if (!achievement?.key) return;

    // Dedupe inside the setQueue updater so synchronous back-to-back calls
    // (e.g. useAchievementSocketBridge + host/player session events firing the
    // same payload) collapse to a single entry. Refs alone are not enough —
    // they don't reflect pending state from the same React batch.
    let skipped = false;
    setQueue(prev => {
      if (currentKeyRef.current === achievement.key) { skipped = true; return prev; }
      if (prev.some(a => a.key === achievement.key)) { skipped = true; return prev; }
      return [...prev, achievement].slice(-5);
    });
    if (skipped) return;

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
            key={`${currentAchievement.key}-${currentEntryId}`}
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
