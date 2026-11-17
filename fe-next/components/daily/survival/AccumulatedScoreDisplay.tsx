'use client';

import { memo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccumulatedScoreDisplayProps {
  currentScore: number;
  lastIncrement: number | null;
  isAnimating: boolean;
}

/**
 * Live projected Season-2 score (0–1000) in the Word Hunt header. No tier label:
 * the projection opens at 800 and only decays, so a tier ladder read "maxed out" from the first word.
 */
export const AccumulatedScoreDisplay = memo<AccumulatedScoreDisplayProps>(({
  currentScore,
  lastIncrement,
  isAnimating,
}) => {
  const springProps = useSpring({
    val: Math.max(0, currentScore),
    from: { val: 0 },
    config: { tension: 120, friction: 20 },
  });

  return (
    <div className="relative @container flex flex-col items-end gap-0.5">
      <AdaptiveMotion.div
        data-testid="score-display"
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
        <AdaptiveAnimatePresence>
          {lastIncrement !== null && lastIncrement > 0 && (
            <AdaptiveMotion.div
              data-testid="score-increment"
              initial={{ opacity: 0, x: 14, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], x: [14, -4, -6, -10], scale: [0.6, 1.15, 1, 0.9] }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={cn(
                'absolute top-1/2 end-full me-2 -translate-y-1/2 pointer-events-none',
                'px-2 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm',
                'text-sm font-black font-neo-display tabular-nums whitespace-nowrap',
                'bg-neo-lime text-neo-black',
              )}
            >
              +{Math.round(lastIncrement)}
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        <div
          className={cn(
            'w-5 h-5 shrink-0 rounded-full flex items-center justify-center',
            'bg-linear-to-br from-neo-lime-light to-neo-lime',
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
        </div>
      </AdaptiveMotion.div>

    </div>
  );
});
AccumulatedScoreDisplay.displayName = 'AccumulatedScoreDisplay';

export default AccumulatedScoreDisplay;
