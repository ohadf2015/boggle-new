'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { EDU_MOTION, staggerDelay, useReducedMotionSafe } from '@/components/education/motion';
import { ACCURACY_LOW } from './rosterModel';

/** Chunky striped accuracy meter for a roster row; the fill grows in from the reading-start edge once, after the list loads. */
export function HomeRosterMeter({ share, index, isRTL }: { share: number; index: number; isRTL: boolean }) {
  const reduced = useReducedMotionSafe();
  const fill = cn('edu-stripes block h-full', share < ACCURACY_LOW ? 'bg-neo-pink' : 'bg-neo-cyan');
  const width = `${Math.round(share * 100)}%`;
  return (
    <span aria-hidden="true" className="relative block h-3 min-w-0 flex-1 overflow-hidden rounded-[4px] border-2 border-neo-cream/40 bg-neo-navy">
      {reduced ? (
        <span data-testid="home-roster-meter-fill" className={fill} style={{ width }} />
      ) : (
        <m.span
          data-testid="home-roster-meter-fill"
          className={fill}
          style={{ width, originX: isRTL ? 1 : 0 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ ...EDU_MOTION.spring.settle, delay: staggerDelay(index) }}
        />
      )}
    </span>
  );
}
