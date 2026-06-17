'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { InlineConfetti } from '@/components/effects/InlineConfetti';
import {
  HIDDEN_ACHIEVEMENT_EVENT,
  type HiddenAchievementEventDetail,
} from '@/lib/achievements/hiddenAchievementBus';
import {
  getHiddenAchievement,
  type HiddenAchievement,
} from '@/lib/achievements/hiddenAchievements';

const REVEAL_MS = 3500;

/**
 * Global, render-on-demand listener for HIDDEN achievements. Mounted once beside
 * EasterEggListener. Subscribes to the single bus event and surfaces a localized
 * "secret unlocked" reveal card with confetti. Purely cosmetic — decoupled from
 * gameplay, which only ever calls the bus.
 */
export default function HiddenAchievementListener() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState<HiddenAchievement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setCurrent(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const id = (e as CustomEvent<HiddenAchievementEventDetail>).detail?.id;
      const achievement = id ? getHiddenAchievement(id) : undefined;
      if (!achievement) return;

      setCurrent(achievement);
      // Dramatic "you found a secret" payoff — same fireworks vocabulary as the
      // Konami easter egg, louder than a routine confetti burst. Cosmetic and
      // guarded: FX must never break the reveal or dedup (no-op under reduced
      // motion / cosy mode internally).
      // Lazy-load confetti on fire (not at module load): this listener mounts
      // from the global provider stack, so a static import would ship
      // canvas-confetti in first-load JS on every page. Best-effort; a failed
      // load/burst must never break the reveal.
      void import('@/utils/confettiUtils')
        .then(({ fireFireworks }) => fireFireworks(3, 2400))
        .catch(() => {});

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCurrent(null), REVEAL_MS);
    };

    window.addEventListener(HIDDEN_ACHIEVEMENT_EVENT, onEvent);
    return () => {
      window.removeEventListener(HIDDEN_ACHIEVEMENT_EVENT, onEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {current && (
        <m.div
          initial={{ opacity: 0, scale: 0.8, y: -24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="fixed left-1/2 top-[max(4.5rem,env(safe-area-inset-top,1rem))] z-[60] -translate-x-1/2 pointer-events-auto"
          onClick={dismiss}
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'relative flex items-center gap-3 px-5 py-3 rounded-neo',
              'bg-linear-to-r border-neo-thick border-neo-black shadow-hard-lg',
              'cursor-pointer select-none',
              current.color,
            )}
          >
            <InlineConfetti size="md" duration={2200} />

            <m.span
              className="text-3xl"
              animate={{ scale: [1, 1.25, 1], rotate: [0, 12, -12, 0] }}
              transition={{ type: 'tween', duration: 0.6, ease: 'easeInOut' }}
            >
              {current.emoji}
            </m.span>

            <div className="flex flex-col">
              <span className="text-neo-black font-neo-display font-extrabold text-[0.7rem] uppercase tracking-wide opacity-80">
                {t('hiddenAchievement.unlockedBanner')}
              </span>
              <span className="text-neo-black font-neo-display font-bold text-base leading-tight whitespace-nowrap">
                {t(current.titleKey)}
              </span>
              <span className="text-neo-black font-neo-body text-xs leading-tight opacity-90">
                {t(current.descKey)}
              </span>
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
