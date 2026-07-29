'use client';

/**
 * StreakSavedCelebration
 *
 * One-shot "your streak was saved by a freeze" moment. Fires only when a
 * Streak Freeze was *newly consumed on this submit* (the bridge event from
 * wordHuntRoutes), NOT off steady-state protection — otherwise it would
 * re-fire every day after the first bridge.
 *
 * Frost/cyan themed cousin of StreakMilestoneCelebration. Built from the same
 * confetti infra (no new raster art) to stay on-brand neo-brutalist.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
import { fireConfetti } from '@/utils/confettiUtils';
import { Button } from '@/components/ui/button';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { CelebrationMascotWithEntrance } from '@/components/ui/CelebrationMascot';

interface StreakSavedCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  /** Freezes left in the player's pool after this consume */
  freezesRemaining?: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Frost palette — icy cyan/white, distinct from the warm streak-milestone burst
const FROST_COLORS = ['#00FFFF', '#A7F3FF', '#FFFFFF', '#7DD3FC', '#BFFF00'];

const StreakSavedCelebration: React.FC<StreakSavedCelebrationProps> = ({
  isOpen,
  onClose,
  freezesRemaining,
  t,
}) => {
  const { isLowEnd, enableComplexAnimations } = useDevicePerformance();
  const skipConfetti = useMemo(
    () => isLowEnd || !enableComplexAnimations,
    [isLowEnd, enableComplexAnimations]
  );

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const triggerCelebration = useCallback(() => {
    if (skipConfetti) return;
    // A crisp double "shatter" burst from both lower corners — reads as ice
    // cracking inward to shield the streak.
    fireConfetti({ particleCount: 60, spread: 100, origin: { x: 0.2, y: 0.7 }, colors: FROST_COLORS });
    fireConfetti({ particleCount: 60, spread: 100, origin: { x: 0.8, y: 0.7 }, colors: FROST_COLORS });
    const t1 = setTimeout(() => {
      fireConfetti({ particleCount: 90, spread: 160, origin: { x: 0.5, y: 0.55 }, colors: FROST_COLORS });
    }, 250);
    timeoutsRef.current.push(t1);
  }, [skipConfetti]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(triggerCelebration, 120);
    return () => {
      clearTimeout(timer);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [isOpen, triggerCelebration]);

  const freezesLabel =
    typeof freezesRemaining === 'number'
      ? freezesRemaining <= 0
        ? t('streak.saved.freezesLeftNone')
        : t('streak.saved.freezesLeft', { count: freezesRemaining })
      : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <m.div
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 8 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="relative bg-linear-to-br from-neo-navy to-neo-navy-light rounded-neo border-4 border-neo-cyan p-8 max-w-md w-full text-center shadow-hard-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-2 right-2 text-slate-400 hover:text-white"
              aria-label={t('streak.saved.dismiss')}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Mascot — Lexi swoops in with the shield */}
            <div className="flex justify-center mb-2">
              <CelebrationMascotWithEntrance variant="celebration" size="xl" delay={0.3} clipBorder="none" />
            </div>

            {/* Animated frost shield */}
            <m.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: [0, 1.25, 1], rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-neo border-3 border-neo-cyan bg-neo-cyan/10 shadow-hard"
            >
              <ShieldCheck className="w-14 h-14 text-neo-cyan" strokeWidth={2.5} />
            </m.div>

            {/* Title */}
            <m.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 26 }}
              className="text-3xl md:text-4xl font-black text-white mb-2 uppercase"
            >
              {t('streak.saved.title')}
            </m.h2>

            {/* Subtitle */}
            <m.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.42, type: 'spring', stiffness: 280, damping: 26 }}
              className="text-slate-300 text-base mb-4"
            >
              {t('streak.saved.subtitle')}
            </m.p>

            {/* Freezes remaining pill */}
            {freezesLabel && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5, stiffness: 400, damping: 22 }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-neo-cyan/15 rounded-neo border-3 border-neo-cyan/50 shadow-hard-sm mb-6"
              >
                <span className="text-lg" aria-hidden>❄️</span>
                <span className="text-sm font-black text-neo-cyan uppercase tracking-wide">
                  {freezesLabel}
                </span>
              </m.div>
            )}

            {/* Dismiss */}
            <m.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 26 }}
            >
              <Button
                onClick={onClose}
                className="w-full max-w-btn py-4 text-lg font-black uppercase bg-linear-to-r from-neo-cyan to-neo-lime text-neo-navy border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
              >
                {t('streak.saved.dismiss')}
              </Button>
            </m.div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default StreakSavedCelebration;
