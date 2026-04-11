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
  t: (key: string) => string;
}

/**
 * Score tier thresholds for subtle color coding
 * Thresholds based on typical word hunt scoring patterns
 * Colors are muted to avoid distraction during gameplay
 */
const SCORE_TIERS = {
  LOW: 75,       // 0-74: Needs improvement
  MEDIUM: 175,   // 75-174: Average
  GOOD: 300,     // 175-299: Good
  // 300+: Excellent
} as const;

/**
 * Get subtle color classes based on score
 * Uses muted tones to provide feedback without distraction
 */
function getScoreColorClasses(score: number): {
  gradient: string;
  iconColor: string;
  textColor: string;
} {
  if (score < SCORE_TIERS.LOW) {
    // Low score - muted warm tone (not alarming red)
    return {
      gradient: 'from-amber-400 to-orange-400',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  if (score < SCORE_TIERS.MEDIUM) {
    // Medium score - standard yellow/orange (original style)
    return {
      gradient: 'from-neo-yellow to-neo-orange',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  if (score < SCORE_TIERS.GOOD) {
    // Good score - subtle lime tint
    return {
      gradient: 'from-neo-lime-light to-neo-yellow',
      iconColor: 'text-neo-black/80',
      textColor: 'text-neo-black',
    };
  }
  // Excellent score - subtle cyan/lime
  return {
    gradient: 'from-neo-lime to-neo-cyan-light',
    iconColor: 'text-neo-black/80',
    textColor: 'text-neo-black',
  };
}

/**
 * Accumulated Score Display Component
 * Shows live-updating score with neo-brutalist styling and pop animations
 * Colors dynamically change based on score performance
 */
export const AccumulatedScoreDisplay: React.FC<AccumulatedScoreDisplayProps> = ({
  currentScore,
  lastIncrement,
  isAnimating,
  t,
}) => {
  // Memoize color classes to prevent recalculation on every render
  const scoreColors = useMemo(() => getScoreColorClasses(currentScore), [currentScore]);

  // Smooth counting animation — interpolates score on every frame
  const springProps = useSpring({
    val: Math.max(0, currentScore),
    from: { val: 0 },
    config: { tension: 120, friction: 20 },
  });

  return (
    <div className="relative @container">
      {/* Score Container — lightweight HUD style */}
      <AdaptiveMotion.div
        className={cn(
          'relative flex items-center gap-2',
          'px-3 py-1.5',
          'bg-neo-black/60 backdrop-blur-sm',
          'border-2 border-neo-cream/15',
          'rounded-full',
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
        {/* Icon with tier color glow */}
        <div className={cn(
          'w-5 h-5 shrink-0 rounded-full flex items-center justify-center',
          'bg-linear-to-br',
          scoreColors.gradient,
        )}>
          <TrendingUp className="w-3 h-3 text-neo-black" />
        </div>

        {/* Score Value */}
        <div className="relative overflow-visible">
          <animated.span
            className="text-xl @[100px]:text-2xl font-black font-neo-display text-neo-cream tabular-nums block whitespace-nowrap"
          >
            {springProps.val.to((v) => Math.round(v).toLocaleString())}
          </animated.span>

          {/* Floating increment */}
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
                  'absolute -top-5 -right-4',
                  'px-1.5 py-0.5',
                  'text-[11px] font-black font-neo-display',
                  'rounded-full',
                  lastIncrement > 0
                    ? 'text-neo-lime drop-shadow-[0_0_6px_rgba(191,255,0,0.6)]'
                    : 'text-neo-pink drop-shadow-[0_0_6px_rgba(255,20,147,0.6)]'
                )}
              >
                {lastIncrement > 0 ? '+' : ''}
                {Math.round(lastIncrement)}
              </AdaptiveMotion.div>
            )}
          </AdaptiveAnimatePresence>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
};

export default AccumulatedScoreDisplay;
