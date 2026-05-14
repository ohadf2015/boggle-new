'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface TvGapIndicatorProps {
  leaderScore: number;
  secondScore: number;
  leaderName: string;
  secondName: string;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const GAP_THRESHOLD = 0.15; // 15% of leader score
const CLOSING_FAST_THRESHOLD = 0.3; // 30% decrease in gap

/**
 * TvGapIndicator - Shows gap between #1 and #2 in TV broadcast leaderboard
 * Renders between rank 1 and rank 2 when gap is significant (>15%)
 */
const TvGapIndicator = memo<TvGapIndicatorProps>(({
  leaderScore,
  secondScore,
  leaderName: _leaderName,
  secondName: _secondName,
  t,
}) => {
  const gap = leaderScore - secondScore;
  const gapRatio = leaderScore > 0 ? gap / leaderScore : 0;
  const prevGapRef = useRef(gap);
  const [isClosingFast, setIsClosingFast] = useState(false);

  useEffect(() => {
    const prevGap = prevGapRef.current;
    if (prevGap > 0 && gap < prevGap) {
      const decrease = (prevGap - gap) / prevGap;
      if (decrease > CLOSING_FAST_THRESHOLD) {
        setIsClosingFast(true);
        const timer = setTimeout(() => setIsClosingFast(false), 10000);
        return () => clearTimeout(timer);
      }
    }
    prevGapRef.current = gap;
    return undefined;
  }, [gap]);

  if (gapRatio <= GAP_THRESHOLD) return null;

  const label = t('tvBroadcast.ptsGap', { gap });

  return (
    <m.div
      data-testid="gap-indicator"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex items-center justify-center gap-2 py-1.5 px-3 my-1 border-dashed border-2 rounded-neo',
        isClosingFast ? 'border-neo-orange bg-neo-orange/10' : 'border-neo-black/30 bg-neo-cream/50'
      )}
      aria-label={label}
    >
      <AnimatePresence mode="wait">
        {isClosingFast ? (
          <m.div
            key="closing"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-neo-orange" />
            <span className="font-black text-sm text-neo-orange uppercase">
              {t('tvBroadcast.closingFast')}
            </span>
          </m.div>
        ) : (
          <m.div key="gap" className="flex items-center gap-1.5">
            <span className="text-neo-black/50 text-xs font-bold">
              {'--- '}
            </span>
            <span className="font-black text-xs text-neo-black/60 uppercase">
              {t('tvBroadcast.gap')}:{' '}
              {label}
            </span>
            <span className="text-neo-black/50 text-xs font-bold">
              {' ---'}
            </span>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
});

TvGapIndicator.displayName = 'TvGapIndicator';

export default TvGapIndicator;
