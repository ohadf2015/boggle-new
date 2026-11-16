'use client';

import { Star, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { candyKey } from './candyKey';

interface StarTrackProps {
  total: number;
  current: number;
  outcomes: Array<{ correct: boolean } | undefined>;
  label: string;
}

/*
 * The round as a trail of stars to collect on the way to a trophy: a right
 * answer pops a gold star into its slot, a miss leaves a pink mark, and the
 * slot being played glows. Long teacher lists (over 20 words) fall back to a
 * single filling bar, where twenty-plus stars would be too small to read.
 */
/** Rendered once by the drill root. */
export const STAR_KEYFRAMES =
  '@keyframes lc-star-pop{0%{transform:scale(.3) rotate(-30deg)}60%{transform:scale(1.35) rotate(8deg)}100%{transform:scale(1) rotate(0)}}';

export function StarTrack({ total, current, outcomes, label }: StarTrackProps) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={label}
        data-testid="practice-progress-track"
        className="flex min-w-0 flex-1 items-center gap-1"
      >
        {total <= 20 ? (
          Array.from({ length: total }, (_, i) => {
            const o = outcomes[i];
            const state = o ? (o.correct ? 'hit' : 'miss') : i === current ? 'current' : 'todo';
            return (
              <span
                key={i}
                data-state={state}
                style={state === 'hit' ? candyKey('gold', 2) : state === 'miss' ? candyKey('pink', 2) : undefined}
                className={cn(
                  'flex aspect-square min-w-0 max-w-8 flex-1 items-center justify-center rounded-full',
                  state === 'hit' && 'motion-safe:animate-[lc-star-pop_380ms_cubic-bezier(.34,1.56,.64,1)]',
                  state === 'current' &&
                    'border-2 border-neo-cyan bg-neo-cyan/20 shadow-[0_0_0_3px_rgba(0,255,255,0.18)] motion-safe:animate-pulse',
                  state === 'todo' && 'border-2 border-neo-cream/30 bg-neo-white/5'
                )}
              >
                {state === 'hit' ? (
                  <Star aria-hidden="true" className="size-[60%] fill-neo-navy text-neo-navy" strokeWidth={2.5} />
                ) : state === 'miss' ? (
                  <X aria-hidden="true" className="size-[55%] text-neo-navy" strokeWidth={4} />
                ) : (
                  <Star aria-hidden="true" className={cn('size-[50%]', state === 'current' ? 'text-neo-cyan' : 'text-neo-cream/35')} />
                )}
              </span>
            );
          })
        ) : (
          <span className="h-3 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-white/15">
            <span
              className="block h-full bg-neo-yellow transition-[width] duration-300"
              style={{ width: `${(current / Math.max(total, 1)) * 100}%` }}
            />
          </span>
        )}
      </div>
      {/* The goal at the end of the trail. Decorative: the bar carries the numbers. */}
      <span
        aria-hidden="true"
        style={candyKey(current >= total ? 'lime' : 'cream', 2)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <Trophy className="size-4 text-neo-navy" strokeWidth={2.5} />
      </span>
    </div>
  );
}

export default StarTrack;
