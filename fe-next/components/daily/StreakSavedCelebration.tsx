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
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-in fade-in-0 duration-300"
          onClick={onClose}
        >
          <div
            className="relative bg-linear-to-br from-neo-navy to-neo-navy-light rounded-neo border-4 border-neo-cyan p-8 max-w-md w-full text-center shadow-hard-lg animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300"
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
            <div
              className="mx-auto mb-4 w-24 h-24 flex items-center justify-center rounded-neo border-3 border-neo-cyan bg-neo-cyan/10 shadow-hard animate-in zoom-in-50 duration-300"
              style={{ animationDelay: '0.15s' }}
            >
              <ShieldCheck className="w-14 h-14 text-neo-cyan" strokeWidth={2.5} />
            </div>

            {/* Title */}
            <h2
              className="text-3xl md:text-4xl font-black text-white mb-2 uppercase animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.3s' }}
            >
              {t('streak.saved.title')}
            </h2>

            {/* Subtitle */}
            <p
              className="text-slate-300 text-base mb-4 animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.42s' }}
            >
              {t('streak.saved.subtitle')}
            </p>

            {/* Freezes remaining pill */}
            {freezesLabel && (
              <div
                className="inline-flex items-center gap-2 px-5 py-2 bg-neo-cyan/15 rounded-neo border-3 border-neo-cyan/50 shadow-hard-sm mb-6 animate-in zoom-in-50 duration-300"
                style={{ animationDelay: '0.5s' }}
              >
                <span className="text-lg" aria-hidden>❄️</span>
                <span className="text-sm font-black text-neo-cyan uppercase tracking-wide">
                  {freezesLabel}
                </span>
              </div>
            )}

            {/* Dismiss */}
            <div
              className="animate-in fade-in-0 zoom-in-95 duration-300"
              style={{ animationDelay: '0.6s' }}
            >
              <Button
                onClick={onClose}
                className="w-full max-w-btn py-4 text-lg font-black uppercase bg-linear-to-r from-neo-cyan to-neo-lime text-neo-navy border-4 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
              >
                {t('streak.saved.dismiss')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StreakSavedCelebration;
