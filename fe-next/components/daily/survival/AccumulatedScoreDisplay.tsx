'use client';

import React, { useMemo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccumulatedScoreDisplayProps {
  currentScore: number;
  lastIncrement: number | null;
  isAnimating: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Season-2 efficiency bands (0–1000). Mirror the results-page tier color thresholds.
const SCORE_TIERS = {
  SILVER: 400,
  GOLD: 600,
  PLATINUM: 800,
} as const;

type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

interface TierInfo {
  tier: TierKey;
  nextTier: TierKey | null;
  nextThreshold: number | null;
  gradient: string;
  labelColor: string;
}

function getTierInfo(score: number): TierInfo {
  if (score < SCORE_TIERS.SILVER) {
    return {
      tier: 'bronze',
      nextTier: 'silver',
      nextThreshold: SCORE_TIERS.SILVER,
      gradient: 'from-neo-pink-muted to-neo-pink',
      labelColor: 'text-neo-pink',
    };
  }
  if (score < SCORE_TIERS.GOLD) {
    return {
      tier: 'silver',
      nextTier: 'gold',
      nextThreshold: SCORE_TIERS.GOLD,
      gradient: 'from-neo-orange to-neo-yellow',
      labelColor: 'text-neo-orange',
    };
  }
  if (score < SCORE_TIERS.PLATINUM) {
    return {
      tier: 'gold',
      nextTier: 'platinum',
      nextThreshold: SCORE_TIERS.PLATINUM,
      gradient: 'from-neo-yellow to-neo-lime-light',
      labelColor: 'text-neo-yellow',
    };
  }
  return {
    tier: 'platinum',
    nextTier: null,
    nextThreshold: null,
    gradient: 'from-neo-lime-light to-neo-lime',
    labelColor: 'text-neo-lime',
  };
}

/**
 * Accumulated Score Display — shows live projected Season-2 score (0–1000)
 * that matches what the results page will eventually render, plus a witty
 * tier-progress note ("150 to Gold" / "Legendary · maxed out").
 */
export const AccumulatedScoreDisplay: React.FC<AccumulatedScoreDisplayProps> = ({
  currentScore,
  lastIncrement,
  isAnimating,
  t,
}) => {
  const tierInfo = useMemo(() => getTierInfo(currentScore), [currentScore]);

  const tierLabel = t(`wordHunt.survival.score.tier.${tierInfo.tier}`);
  const flavor = t(`wordHunt.survival.score.tier.${tierInfo.tier}Flavor`);
  const progressNote = useMemo(() => {
    if (tierInfo.nextTier === null || tierInfo.nextThreshold === null) {
      return t('wordHunt.survival.score.tier.maxed');
    }
    const pointsToNext = Math.max(0, tierInfo.nextThreshold - currentScore);
    const nextLabel = t(`wordHunt.survival.score.tier.${tierInfo.nextTier}`);
    return t('wordHunt.survival.score.tier.toNext', {
      points: pointsToNext,
      next: nextLabel,
    });
  }, [tierInfo, currentScore, t]);

  const springProps = useSpring({
    val: Math.max(0, currentScore),
    from: { val: 0 },
    config: { tension: 120, friction: 20 },
  });

  return (
    <div className="relative @container flex flex-col items-end gap-0.5">
      <AdaptiveMotion.div
        className={cn(
          'relative flex items-center gap-2',
          'px-3 py-1.5',
          'bg-neo-navy-light',
          'border-neo border-neo-cream/30',
          'rounded-full shadow-hard-sm',
          'min-w-[72px]',
          isAnimating && 'score-glow-pulse',
        )}
        animate={isAnimating ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{
          type: 'tween',
          duration: 0.3,
          damping: 18,
          stiffness: 350,
        }}
      >
        <div
          className={cn(
            'w-5 h-5 shrink-0 rounded-full flex items-center justify-center',
            'bg-linear-to-br',
            tierInfo.gradient,
          )}
        >
          <TrendingUp className="w-3 h-3 text-neo-black" />
        </div>

        <div className="relative overflow-visible">
          <animated.span
            className="text-xl @[100px]:text-2xl font-black font-neo-display text-neo-cream tabular-nums block whitespace-nowrap"
          >
            {springProps.val.to((v) => Math.round(v).toLocaleString())}
          </animated.span>

          <AdaptiveAnimatePresence>
            {lastIncrement !== null && lastIncrement !== 0 && (
              <AdaptiveMotion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: [0, -18, -24, -30],
                  scale: [0.5, 1.1, 1, 0.8],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className={cn(
                  'absolute -top-5 left-1/2 -translate-x-1/2',
                  'px-1.5 py-0.5',
                  'text-[11px] font-black font-neo-display',
                  'rounded-full',
                  lastIncrement > 0
                    ? 'text-neo-lime drop-shadow-[0_0_6px_rgba(191,255,0,0.6)]'
                    : 'text-neo-pink drop-shadow-[0_0_6px_rgba(255,20,147,0.6)]',
                )}
              >
                {lastIncrement > 0 ? '+' : ''}
                {Math.round(lastIncrement)}
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
        </div>
      </AdaptiveMotion.div>

      <div
        className="flex items-center gap-1.5 text-[10px] leading-tight font-neo-body whitespace-nowrap"
        data-testid="tier-progress-note"
      >
        <span className={cn('font-black uppercase tracking-wide', tierInfo.labelColor)}>
          {tierLabel}
        </span>
        <span className="text-neo-cream/50">·</span>
        <span className="text-neo-cream/70 italic">{flavor}</span>
        <span className="text-neo-cream/50">·</span>
        <span className="text-neo-cream/80 font-bold">{progressNote}</span>
      </div>
    </div>
  );
};

export default AccumulatedScoreDisplay;
