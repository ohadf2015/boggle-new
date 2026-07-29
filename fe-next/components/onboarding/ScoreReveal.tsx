'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import { RotateCcw, ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireFireworks } from '@/utils/confettiUtils';

// Generated once at module load — avoids impure Math.random calls during render
const SPARKLE_COLORS = ['text-neo-lime', 'text-neo-pink', 'text-neo-cyan'] as const;
const SPARKLE_SIZES = ['w-3 h-3', 'w-4 h-4', 'w-5 h-5'] as const;
const INITIAL_SPARKLES = Array.from(
  { length: 4 + Math.floor(Math.random() * 3) },
  () => ({
    x: Math.random() < 0.5 ? -14 + Math.random() * 10 : 88 + Math.random() * 12,
    y: -10 + Math.random() * 80,
    delay: 0.3 + Math.random() * 0.6,
    startRotate: -60 + Math.random() * 30,
    size: SPARKLE_SIZES[Math.floor(Math.random() * SPARKLE_SIZES.length)],
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
  })
);

interface ScoreRevealProps {
  score: number;
  averageScore: number;
  onTryAgain: () => void;
  onContinue: () => void;
}

/**
 * ScoreReveal - Celebration screen after first game.
 * Step 4 of the FTUE: The Hook (90-120s).
 * Celebration-first design — Continue is the primary CTA.
 */
const ScoreReveal: React.FC<ScoreRevealProps> = ({
  score,
  averageScore,
  onTryAgain,
  onContinue,
}) => {
  const { t, dir } = useLanguage();
  const isAboveAverage = score >= averageScore;

  const sparkles = INITIAL_SPARKLES;

  const barPercent = useMemo(() => {
    const max = Math.max(score, averageScore, 1);
    return Math.min(Math.round((score / max) * 100), 100);
  }, [score, averageScore]);

  // Count-up animation: climb from 0 → score over ~900ms.
  // Starts slightly after mount so the user sees the ring/trophy land first,
  // then watches the number tick up — a classic arcade reveal beat.
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const target = Math.max(0, Math.floor(score));
    const durationMs = 900;
    const startDelayMs = 350;
    let rafId: number | null = null;
    let startTime: number | null = null;

    const startTimer = setTimeout(() => {
      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        // easeOutCubic — fast start, gentle settle
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayScore(Math.round(target * eased));
        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [score]);

  useEffect(() => {
    fireVictoryConfetti();
    // Follow the opening burst with staggered firework bursts (~1.4s long),
    // so the celebration feels earned rather than a single pop.
    const cancelFireworks = fireFireworks(3, 1400);
    return () => {
      cancelFireworks();
    };
  }, []);

  return (
    <m.div
      data-testid="score-reveal"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="w-full max-w-sm lg:max-w-md mx-auto relative overflow-hidden"
      dir={dir}
    >
      {/* Floating sparkle decorations — positions randomized per render */}
      {sparkles.map((spark) => (
        <m.div
          key={`spark-${spark.x}-${spark.y}-${spark.delay}`}
          initial={{ scale: 0, rotate: spark.startRotate }}
          animate={{ scale: [0, 1.2, 1], rotate: [spark.startRotate, 15, 0] }}
          transition={{ delay: spark.delay, duration: 0.5, ease: 'easeOut' }}
          className="absolute pointer-events-none"
          style={{ left: `${spark.x}%`, top: `${spark.y}%` }}
        >
          <Sparkles className={cn(spark.size, spark.color)} />
        </m.div>
      ))}

      <div className="bg-neo-cream border-3 border-neo-black rounded-neo p-6 shadow-hard-lg text-center relative overflow-hidden">
        {/* Subtle radial glow behind score */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: isAboveAverage
              ? 'radial-gradient(circle at 50% 35%, #BFFF00 0%, transparent 60%)'
              : 'radial-gradient(circle at 50% 35%, #00FFFF 0%, transparent 60%)',
          }}
        />

        {/* Celebration header */}
        <m.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 15 }}
          className="mb-1 relative"
        >
          <Trophy className="w-8 h-8 text-neo-lime mx-auto drop-shadow-[0_0_8px_rgba(191,255,0,0.5)]" />
        </m.div>

        <m.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-black uppercase tracking-widest text-neo-black/50 mb-1"
        >
          {t('onboarding.ftue.niceWork')}
        </m.div>

        {/* Score display with decorative circle */}
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 18 }}
          className="relative mb-3"
        >
          <div className="relative inline-block">
            {/* Decorative ring */}
            <m.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className={cn(
                'absolute -inset-4 rounded-full border-3 border-dashed',
                isAboveAverage ? 'border-neo-lime/40' : 'border-neo-cyan/40'
              )}
            />
            <div
              className="text-7xl font-black text-neo-lime relative tabular-nums"
              style={{ WebkitTextStroke: '2.5px black' }}
              aria-label={String(score)}
            >
              {displayScore}
            </div>
          </div>
          {isAboveAverage && (
            <m.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={cn(
                'inline-block mt-2 px-3 py-0.5 rounded-full',
                'bg-neo-lime/20 border-2 border-neo-lime/50',
                'text-xs font-black text-neo-black/80 uppercase tracking-wide'
              )}
            >
              {t('onboarding.ftue.aboveAverage')}
            </m.div>
          )}
        </m.div>

        {/* Visual comparison bar */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-5 px-2"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-neo-black/50 uppercase tracking-wider mb-1.5">
            <span>{t('onboarding.ftue.yourScoreLabel')}</span>
            <span>{t('onboarding.ftue.averageScoreLabel')}</span>
          </div>
          <div className="relative h-5 bg-neo-black/10 rounded-full border-2 border-neo-black/20 overflow-hidden">
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${barPercent}%` }}
              transition={{ delay: 0.7, duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className={cn(
                'absolute inset-y-0 left-0 rounded-full',
                isAboveAverage ? 'bg-neo-lime' : 'bg-neo-cyan'
              )}
            />
            {/* Average marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-neo-black/60"
              style={{
                left: `${Math.min(Math.round((averageScore / Math.max(score, averageScore, 1)) * 100), 100)}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-black text-neo-black">{score}</span>
            <span className="text-sm font-bold text-neo-black/50">{averageScore}</span>
          </div>
        </m.div>

        {/* Action buttons — Continue is primary */}
        <div className="flex flex-col gap-2 relative">
          <m.button
            data-testid="continue-button"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [0.9, 1.04, 1], opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5, ease: 'easeOut' }}
            onClick={onContinue}
            className={cn(
              'w-full py-3.5 bg-neo-lime border-3 border-neo-black rounded-neo',
              'font-black text-neo-black text-base uppercase tracking-wide',
              'shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed',
              'transition-all active:translate-y-[2px]',
              'flex items-center justify-center gap-2'
            )}
          >
            {t('onboarding.ftue.continue')}
            <ArrowRight className="w-5 h-5" />
          </m.button>
          <button
            onClick={onTryAgain}
            className={cn(
              'w-full py-2 bg-transparent border-2 border-neo-black/20 rounded-neo',
              'font-bold text-neo-black/50 text-sm',
              'hover:bg-neo-black/5 hover:border-neo-black/30 transition-colors',
              'flex items-center justify-center gap-2'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('onboarding.ftue.tryAgain')}
          </button>
        </div>
      </div>
    </m.div>
  );
};

export default ScoreReveal;
