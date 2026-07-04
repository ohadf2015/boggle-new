'use client';

import React, { useEffect, useRef } from 'react';
import { m, useSpring, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import type { ActiveBossConstraint } from '@/types/wordForge';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface WordForgeHUDProps {
  round: number;
  maxRounds: number;
  timeRemaining: number;
  timerDuration: number; // Available for timer arc visualization in v2
  roundScore: number;
  roundTarget: number;
  bossConstraint: ActiveBossConstraint | null;
  wordsFoundCount?: number;
  /** Timestamp (ms) of last word submission — drives live heat-decay bar. */
  chainStartedAt?: number;
  /** Consecutive clean rounds (no misfires) — drives Iron Streak glow. */
  ironStreak?: number;
}

/**
 * WordForgeHUD — Top bar showing round, timer, score, and progress bar.
 */
export function WordForgeHUD({
  round,
  maxRounds,
  timeRemaining,
  timerDuration,
  roundScore,
  roundTarget,
  bossConstraint,
  wordsFoundCount = 0,
  chainStartedAt = 0,
  ironStreak = 0,
}: WordForgeHUDProps): React.JSX.Element {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const progress = Math.min(100, (roundScore / roundTarget) * 100);
  const isLowTime = timeRemaining <= 10;
  const isCriticalTime = timeRemaining <= 5;
  const isOverTarget = roundScore >= roundTarget;

  // Animated score counter
  const scoreMotionValue = useMotionValue(0);
  const scoreSpring = useSpring(scoreMotionValue, { stiffness: 120, damping: 20 });
  const displayScore = useTransform(scoreSpring, (v) => Math.round(v));
  const prevScoreRef = useRef(roundScore);
  const [scorePopping, setScorePopping] = React.useState(false);

  useEffect(() => {
    scoreMotionValue.set(roundScore);
    if (roundScore > prevScoreRef.current && !prefersReducedMotion) {
      setScorePopping(true);
      const timer = setTimeout(() => setScorePopping(false), 300);
      prevScoreRef.current = roundScore;
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = roundScore;
    return undefined;
  }, [roundScore, scoreMotionValue, prefersReducedMotion]);

  // Words found pop
  const prevWordsRef = useRef(wordsFoundCount);
  const [wordsPopping, setWordsPopping] = React.useState(false);
  useEffect(() => {
    if (wordsFoundCount > prevWordsRef.current && !prefersReducedMotion) {
      setWordsPopping(true);
      const timer = setTimeout(() => setWordsPopping(false), 250);
      prevWordsRef.current = wordsFoundCount;
      return () => clearTimeout(timer);
    }
    prevWordsRef.current = wordsFoundCount;
    return undefined;
  }, [wordsFoundCount, prefersReducedMotion]);

  // Live heat-decay bar: decays 8%/sec from 100% to 40% floor
  const [heatPct, setHeatPct] = React.useState(100);
  useEffect(() => {
    if (!chainStartedAt) return;
    setHeatPct(100);
    const id = setInterval(() => {
      const elapsed = (Date.now() - chainStartedAt) / 1000;
      setHeatPct(Math.max(40, Math.round((1 - 0.08 * elapsed) * 100)));
    }, 100);
    return () => clearInterval(id);
  }, [chainStartedAt]);

  return (
    <div className={cn(
      'border-b-3 border-neo-black px-4 pt-3 pb-2 space-y-2',
      bossConstraint ? 'bg-neo-red/10 border-neo-red/50' : 'bg-[#0A0A1A]',
    )}>
      {/* Top row: Round | Timer | Score */}
      <div className="flex items-center justify-between">
        {bossConstraint ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neo-red/20 border border-neo-red/50 rounded-neo">
            <span className="text-neo-red text-sm">{bossConstraint.def.icon}</span>
            <span className="text-xs font-black uppercase text-neo-red font-neo-display tracking-wide">
              {bossConstraint.def.name}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold uppercase text-neo-cream/60 font-neo-body">
            {t('wordForge.round')} {round}/{maxRounds}
          </span>
        )}

        <span className={cn(
          'text-lg font-black font-neo-display tabular-nums',
          isCriticalTime ? 'text-neo-red motion-safe:animate-neo-shake text-xl' :
          isLowTime ? 'text-neo-red motion-safe:animate-pulse-subtle' : 'text-neo-cream',
        )}>
          ⏱ {timeRemaining}s
        </span>

        <m.span
          className={cn(
            'text-lg font-black font-neo-display tabular-nums',
            isOverTarget ? 'text-neo-lime' : 'text-tier-gold',
          )}
          animate={scorePopping ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
        >
          <AnimatedNumber value={displayScore} />
        </m.span>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-neo-cream/10 border-2 border-neo-black rounded-neo overflow-hidden">
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-all duration-300 ease-out rounded-neo',
            isOverTarget ? 'bg-neo-lime' : bossConstraint ? 'bg-neo-red motion-safe:animate-pulse-subtle' : 'bg-tier-gold',
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-end pe-2 text-[10px] font-bold text-neo-black/70">
          {roundScore}/{roundTarget}
        </span>
      </div>

      {/* Heat bar — decays 8%/sec since last word (40% floor) */}
      {chainStartedAt > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] shrink-0">
            {heatPct >= 75 ? '🔥' : heatPct >= 55 ? '🌡️' : '❄️'}
          </span>
          <div className="flex-1 h-2 bg-neo-cream/10 border border-neo-black/30 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-none',
                heatPct >= 80 ? 'bg-neo-orange' :
                heatPct >= 60 ? 'bg-neo-yellow' :
                heatPct >= 50 ? 'bg-neo-cyan' : 'bg-neo-cyan/40',
              )}
              style={{ width: `${heatPct}%` }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-neo-cream/50 shrink-0 w-8 text-right">
            ×{(heatPct / 100).toFixed(2)}
          </span>
        </div>
      )}

      {/* Words found + Iron Streak row */}
      <div className="flex items-center justify-center gap-2">
        {wordsFoundCount > 0 && (
          <m.span
            className="text-[10px] font-bold text-neo-cream/50 bg-neo-cream/10 px-2 py-0.5 rounded-neo border border-neo-cream/20"
            animate={wordsPopping ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            {wordsFoundCount} {t('wordForge.wordsFound').toLowerCase()}
          </m.span>
        )}
        {ironStreak >= 1 && (
          <m.span
            key={ironStreak}
            initial={prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className={cn(
              'text-[10px] font-black px-2 py-0.5 rounded-neo border font-neo-display tracking-wide',
              ironStreak >= 5
                ? 'text-neo-red bg-neo-red/20 border-neo-red/60 motion-safe:animate-pulse-subtle'
                : ironStreak >= 3
                ? 'text-neo-orange bg-neo-orange/15 border-neo-orange/50'
                : 'text-neo-yellow/80 bg-neo-yellow/10 border-neo-yellow/30',
            )}
          >
            {ironStreak >= 5 ? '🔥' : ironStreak >= 3 ? '⚡' : '✨'} {t('wordForge.ironStreak')} ×{ironStreak}
          </m.span>
        )}
      </div>
    </div>
  );
}

/** Renders a spring-driven MotionValue as rounded text. */
function AnimatedNumber({ value }: { value: ReturnType<typeof useTransform<number, number>> }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const unsub = value.on('change', (v) => {
      if (ref.current) ref.current.textContent = String(Math.round(v));
    });
    return unsub;
  }, [value]);
  return <span ref={ref}>{Math.round(value.get())}</span>;
}
