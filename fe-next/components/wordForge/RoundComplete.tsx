'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { cn } from '@/lib/utils';

interface RoundCompleteProps {
  round: number;
  score: number;
  target: number;
  wordsFound: number;
  /** True if the round just cleared was a boss round — fires a heavier ceremony. */
  wasBoss?: boolean;
  onContinue: () => void;
}

/**
 * RoundComplete — Brief celebration between rounds.
 * Shows score vs target, auto-advances after 2 seconds or on tap.
 */
export function RoundComplete({
  round,
  score,
  target,
  wordsFound,
  wasBoss = false,
  onContinue,
}: RoundCompleteProps): React.JSX.Element {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();
  const prefersReducedMotion = useReducedMotion();
  const [animatedScore, setAnimatedScore] = useState(0);
  const ceremonyFiredRef = useRef(false);

  // Ceremony — fire once on mount. Boss rounds get a heavier preset stack
  // and the epic-victory sound; normal rounds get a lighter celebration.
  useEffect(() => {
    if (ceremonyFiredRef.current) return;
    ceremonyFiredRef.current = true;
    const x = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
    const y = typeof window !== 'undefined' ? window.innerHeight * 0.42 : 200;
    if (wasBoss) {
      playSound('epicVictory');
      SharedFxApp.spawnBurst('victory-burst', x, y);
      SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 28 });
    } else {
      playSound('levelUp');
      SharedFxApp.spawnBurst('celebration', x, y);
    }
  }, [wasBoss, playSound]);

  // Count up score over 800ms
  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedScore(score);
      return;
    }
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedScore(Math.round(progress * score));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [score, prefersReducedMotion]);

  // Auto-advance after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(onContinue, 2500);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const particles = [
    { x: -30, delay: 0 }, { x: 0, delay: 0.1 }, { x: 20, delay: 0.2 }, { x: -15, delay: 0.15 }, { x: 35, delay: 0.05 },
  ];

  return (
    <div
      className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-4 p-4 cursor-pointer relative overflow-hidden"
      onClick={onContinue}
    >
      {/* Floating particles */}
      {!prefersReducedMotion && particles.map((p, i) => (
        <m.div
          key={`${p.x}-${i}`}
          className="absolute w-2 h-2 rounded-full bg-neo-lime/60"
          initial={{ y: 0, x: p.x, opacity: 1 }}
          animate={{ y: -120, opacity: 0 }}
          transition={{ duration: 1.5, delay: p.delay, ease: 'easeOut' }}
          style={{ bottom: '45%', left: '50%' }}
        />
      ))}

      <div>
        {/* Checkmark burst — bounces in */}
        <m.div
          className="text-6xl mb-4 text-center"
          initial={prefersReducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
        >
          ✅
        </m.div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase text-neo-lime font-neo-display text-center motion-safe:animate-neo-pop">
          {t('wordForge.round')} {round} {t('wordForge.roundCleared')}!
        </h2>

        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="text-3xl font-black text-tier-gold font-neo-display tabular-nums">
            {animatedScore}
          </span>
          <span className="text-lg text-neo-cream/40">/</span>
          <span className="text-lg text-neo-cream/60 font-bold tabular-nums">
            {target}
          </span>
        </div>

        <p className="text-sm text-neo-cream/50 font-neo-body text-center mt-2">
          {wordsFound} {t('wordForge.wordsFound').toLowerCase()}
        </p>

        <m.p
          className="text-xs text-neo-cream/30 font-neo-body text-center mt-6"
          animate={prefersReducedMotion ? {} : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {t('wordForge.tapToContinue')}
        </m.p>
      </div>
    </div>
  );
}
