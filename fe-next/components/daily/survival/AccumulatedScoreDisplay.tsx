'use client';

import { useMemo, memo } from 'react';
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
  lowerThreshold: number;
  nextThreshold: number | null;
  gradient: string;
  fillColor: string;
  labelColor: string;
}

function getTierInfo(score: number): TierInfo {
  if (score < SCORE_TIERS.SILVER) {
    return {
      tier: 'bronze',
      nextTier: 'silver',
      lowerThreshold: 0,
      nextThreshold: SCORE_TIERS.SILVER,
      gradient: 'from-neo-pink-muted to-neo-pink',
      fillColor: 'bg-neo-pink',
      labelColor: 'text-neo-pink',
    };
  }
  if (score < SCORE_TIERS.GOLD) {
    return {
      tier: 'silver',
      nextTier: 'gold',
      lowerThreshold: SCORE_TIERS.SILVER,
      nextThreshold: SCORE_TIERS.GOLD,
      gradient: 'from-neo-orange to-neo-yellow',
      fillColor: 'bg-neo-orange',
      labelColor: 'text-neo-orange',
    };
  }
  if (score < SCORE_TIERS.PLATINUM) {
    return {
      tier: 'gold',
      nextTier: 'platinum',
      lowerThreshold: SCORE_TIERS.GOLD,
      nextThreshold: SCORE_TIERS.PLATINUM,
      gradient: 'from-neo-yellow to-neo-lime-light',
      fillColor: 'bg-neo-yellow',
      labelColor: 'text-neo-yellow',
    };
  }
  return {
    tier: 'platinum',
    nextTier: null,
    lowerThreshold: SCORE_TIERS.PLATINUM,
    nextThreshold: null,
    gradient: 'from-neo-lime-light to-neo-lime',
    fillColor: 'bg-neo-lime',
    labelColor: 'text-neo-lime',
  };
}

/**
 * Accumulated Score Display — shows live projected Season-2 score (0–1000)
 * that matches what the results page will eventually render, plus a witty
 * tier-progress note ("150 to Gold" / "Legendary · maxed out").
 */
export const AccumulatedScoreDisplay = memo<AccumulatedScoreDisplayProps>(({
  currentScore,
  lastIncrement,
  isAnimating,
  t,
}) => {
  const tierInfo = useMemo(() => getTierInfo(currentScore), [currentScore]);

  const tierLabel = t(`wordHunt.survival.score.tier.${tierInfo.tier}`);
  const isMaxed = tierInfo.nextTier === null || tierInfo.nextThreshold === null;
  const progressNote = useMemo(() => {
    if (isMaxed || tierInfo.nextTier === null || tierInfo.nextThreshold === null) {
      return t('wordHunt.survival.score.tier.maxed');
    }
    const pointsToNext = Math.max(0, tierInfo.nextThreshold - currentScore);
    const nextLabel = t(`wordHunt.survival.score.tier.${tierInfo.nextTier}`);
    return t('wordHunt.survival.score.tier.toNext', {
      points: pointsToNext,
      next: nextLabel,
    });
  }, [isMaxed, tierInfo, currentScore, t]);

  const tierProgressPct = useMemo(() => {
    if (isMaxed || tierInfo.nextThreshold === null) return 100;
    const span = tierInfo.nextThreshold - tierInfo.lowerThreshold;
    if (span <= 0) return 0;
    const within = Math.max(0, Math.min(span, currentScore - tierInfo.lowerThreshold));
    return Math.round((within / span) * 100);
  }, [currentScore, tierInfo, isMaxed]);

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
            className="text-xl @[100px]:text-2xl font-black font-neo-display text-neo-white tabular-nums block whitespace-nowrap"
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
        {isMaxed ? (
          <span className="text-neo-lime font-black uppercase tracking-wide">{progressNote}</span>
        ) : (
          <>
            <div
              role="progressbar"
              aria-label={t('wordHunt.survival.score.tier.progressLabel')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={tierProgressPct}
              className="relative h-1.5 w-12 rounded-full bg-neo-cream/15 border border-neo-cream/25 overflow-hidden"
            >
              <AdaptiveMotion.div
                className={cn('absolute inset-y-0 start-0 rounded-full', tierInfo.fillColor)}
                initial={{ width: 0 }}
                animate={{ width: `${tierProgressPct}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 20 }}
              />
            </div>
            <span className="text-neo-white font-bold tabular-nums">{progressNote}</span>
          </>
        )}
      </div>
    </div>
  );
});
AccumulatedScoreDisplay.displayName = 'AccumulatedScoreDisplay';

export default AccumulatedScoreDisplay;
