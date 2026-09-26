'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { RoundFloater } from './useRoundJuice';
import styles from './round.module.css';

/**
 * "+N" floaters: rise from the board toward the score chip (translate only),
 * pooled (≤3 alive), in a pointer-events-none overlay. The number is the
 * server's `wordAccepted.score` — it already includes the combo.
 */
function MpScoreFloatersImpl({ floaters }: { floaters: RoundFloater[] }) {
  if (floaters.length === 0) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {floaters.map((f, i) => (
        <span
          key={f.id}
          data-testid="mp-floater"
          className={cn(
            'absolute top-[42%] start-1/2 -translate-x-1/2 rtl:translate-x-1/2 font-neo-display font-bold tabular-nums text-neo-lime',
            'text-4xl lg:text-6xl [text-shadow:3px_3px_0_var(--neo-black)]',
            styles.flyUp,
          )}
          style={{ ['--fly-y' as string]: `-${34 + i * 4}vh`, marginInlineStart: `${(i - 1) * 28}px` }}
        >
          +{f.points}
        </span>
      ))}
    </div>
  );
}

export const MpScoreFloaters = memo(MpScoreFloatersImpl);
MpScoreFloaters.displayName = 'MpScoreFloaters';
