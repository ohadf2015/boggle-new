'use client';

import { Fragment, memo } from 'react';
import { cn } from '@/lib/utils';
import type { MpStandingRow } from './mpStandings';
import { MpStandingRowItem } from './MpStandingRow';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpStandingsBoardProps {
  rows: MpStandingRow[];
  hiddenCount: number;
  /** My row was pulled up from below the cut: mark the skipped places above it. */
  gapBeforeLast?: boolean;
  /** Is the row at visual position `pos` (1 = top) revealed yet? */
  isRevealed: (pos: number) => boolean;
  onShowAll?: () => void;
  t: TFn;
  className?: string;
}

const CHIP = 'rounded-full bg-neo-navy-light border-2 border-neo-cream/40 px-3 py-0.5 text-xs font-bold text-neo-white/80';

/**
 * The standings, revealed last place → 2nd, then 1st slams in with the crown.
 * Rows keep their slot while hidden (visibility, not mount), so nothing jumps;
 * the rise is transform-only. Rows share the body's height (flex-1, capped), so
 * 2 or 8 players both fill one screen with zero scroll. On a series final the
 * rows are the series ladder: the crown is the champion's and each row carries
 * its round points (`roundScore`) under the name.
 */
function MpStandingsBoardImpl({ rows, hiddenCount, gapBeforeLast = false, isRevealed, onShowAll, t, className }: MpStandingsBoardProps) {
  return (
    <ol data-testid="mp-standings" className={cn('flex flex-col justify-center min-h-0 gap-[calc(6px*var(--mp-u,1))]', className)}>
      {rows.map((r, i) => (
        <Fragment key={r.username}>
          {gapBeforeLast && i === rows.length - 1 && (
            <li
              data-testid="mp-standings-gap"
              aria-hidden="true"
              className={cn('shrink-0 self-center leading-none tracking-[0.3em] font-bold text-neo-white/50 text-[calc(14px*var(--mp-u,1))]', !isRevealed(i + 1) && 'invisible')}
            >
              ···
            </li>
          )}
          <MpStandingRowItem row={r} shown={isRevealed(i + 1)} layout="fit" t={t} />
        </Fragment>
      ))}
      {hiddenCount > 0 && (onShowAll ? (
        <li className="shrink-0 self-center">
          <button
            type="button"
            data-testid="mp-standings-show-all"
            aria-haspopup="dialog"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onShowAll}
            className={cn(CHIP, 'underline decoration-2 underline-offset-2 active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neo-lime')}
          >
            {t('mpUi.results.moreHidden', { count: hiddenCount })}
          </button>
        </li>
      ) : (
        <li className={cn('shrink-0 self-center', CHIP)}>
          {t('mpUi.results.moreHidden', { count: hiddenCount })}
        </li>
      ))}
    </ol>
  );
}

export const MpStandingsBoard = memo(MpStandingsBoardImpl);
MpStandingsBoard.displayName = 'MpStandingsBoard';
