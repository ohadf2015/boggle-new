/**
 * The waiting room's warm-up: tap the lit letter of your own name.
 *
 * Something for thumbs to do in the 20-60s before the teacher presses Start —
 * zero stakes (a miss only resets the combo), language-neutral, no network.
 * Logic lives in `warmUpTap` (pure, seeded). Motion is CSS `motion-safe:` and
 * transform-only; a reduced-motion student gets the same game, just still.
 */

'use client';

import { useMemo, useReducer } from 'react';
import { Flame, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tr, type EduT } from './eduText';
import { initialWarmUp, warmUpLetters, warmUpReducer } from './warmUpTap';

function seedFor(name: string): number {
  let h = 7;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  return h;
}

export function WaitingWarmUp({ username, t }: { username: string; t: EduT }) {
  const letters = useMemo(() => warmUpLetters(username), [username]);
  const [state, dispatch] = useReducer(warmUpReducer, username, (n) => initialWarmUp(seedFor(n)));

  return (
    <section
      data-testid="waiting-warmup"
      aria-label={tr(t, 'academy.live.warmUpTitle', 'Warm-up')}
      className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy/90 p-2.5 shadow-hard [@media(max-height:620px)]:hidden"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate font-neo-display text-xs font-black uppercase tracking-wide text-neo-cream lg:text-sm">
          {tr(t, 'academy.live.warmUpHint', 'Warm-up: tap the glowing letter!')}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {state.combo >= 2 && (
            <span
              key={`combo-${state.combo}`}
              data-testid="warmup-combo"
              className="inline-flex items-center gap-0.5 rounded-full border-[2px] border-neo-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-xs font-black text-neo-black motion-safe:animate-[lc-tile-hit_260ms_ease-out]"
            >
              <Flame className="size-3" strokeWidth={3} aria-hidden="true" />x{state.combo}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-sm font-black tabular-nums text-neo-black">
            <Star className="size-3.5" strokeWidth={3} aria-hidden="true" />
            <span data-testid="warmup-score" aria-live="polite">
              {state.score}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5" dir="ltr">
        {letters.map((letter, i) => {
          const hot = i === state.hot;
          return (
            <button
              key={i}
              type="button"
              data-testid={`warmup-tile-${i}`}
              data-hot={hot ? 'true' : 'false'}
              aria-label={hot ? tr(t, 'academy.live.warmUpTapThis', 'Tap this one') : letter}
              onClick={() => dispatch({ type: 'tap', index: i })}
              className={cn(
                'grid aspect-square place-items-center rounded-neo border-[3px] font-neo-display text-xl font-black leading-none transition-transform duration-100 motion-reduce:transition-none lg:text-2xl',
                'motion-safe:active:scale-90',
                hot
                  ? 'z-10 scale-110 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm motion-safe:animate-[lc-tile-glow_900ms_ease-in-out_infinite]'
                  : 'border-neo-cream bg-neo-navy-light text-neo-cream'
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default WaitingWarmUp;
