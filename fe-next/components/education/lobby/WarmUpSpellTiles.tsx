'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { pulseLive } from '@/lib/education/liveHaptics';
import { tr, type EduT } from './eduText';
import { initialSpell, spellReducer, spellWordIsRtl } from './warmUpSpell';

export const WARM_UP_KEYFRAMES =
  '@keyframes lc-tile-hit{0%{transform:scale(1.35)}100%{transform:scale(1)}}' +
  '@keyframes lc-tile-glow{0%,100%{transform:scale(1.1)}50%{transform:scale(1.18)}}' +
  '@keyframes lc-tile-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}';

const FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black';

/** A list word's letters dealt scrambled; tap them back in order. A wrong tap shakes the tile and costs nothing. */
export function WarmUpSpellTiles({ words, seed, t }: { words: string[][]; seed: number; t: EduT }) {
  const [state, setState] = useState(() => initialSpell(words, seed));
  const [missTile, setMissTile] = useState(-1);
  const sfx = useSoundEffects();
  const [reducedEffects] = useReducedEffects();
  const word = state.words[state.wordIndex];
  const dir = spellWordIsRtl(word) ? 'rtl' : 'ltr';
  const justSpelled = state.spelled > 0 && state.filled === 0 && state.lastHit === true;

  const tap = (tile: number) => {
    const next = spellReducer(state, { type: 'tap', tile });
    if (next === state) return;
    setState(next);
    if (!next.lastHit) {
      setMissTile(tile);
      return;
    }
    setMissTile(-1);
    const done = next.spelled > state.spelled;
    if (done) sfx.playStreakMilestoneSound();
    else sfx.playTileSelectSound();
    pulseLive(done ? 'big' : 'valid', reducedEffects);
  };

  return (
    <section
      data-testid="waiting-warmup"
      data-kind="spell"
      aria-label={tr(t, 'academy.live.warmUpTitle', 'Warm-up')}
      className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy/90 p-2 shadow-hard"
    >
      <style>{WARM_UP_KEYFRAMES}</style>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 font-neo-display text-xs font-black uppercase leading-tight tracking-wide text-neo-cream lg:text-sm">
          {tr(t, 'academy.live.warmUpSpellHint', 'Warm-up: tap the letters in order')}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {justSpelled && (
            <span
              key={`spelled-${state.spelled}`}
              data-testid="warmup-spelled"
              className="rounded-full border-[2px] border-neo-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-xs font-black text-neo-black motion-safe:animate-[lc-tile-hit_260ms_ease-out]"
            >
              {tr(t, 'academy.live.warmUpSpelled', 'Spelled!')}
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

      <div data-testid="warmup-spell-slots" dir={dir} className="mb-2 flex justify-center gap-1">
        {word.map((letter, i) => {
          const done = i < state.filled;
          return (
            <span
              key={`${state.spelled}-${i}`}
              data-testid={`warmup-slot-${i}`}
              data-filled={done ? 'true' : 'false'}
              className={cn(
                'grid h-11 min-w-10 place-items-center rounded-neo border-2 bg-neo-navy-light px-1 font-neo-display text-xl font-black leading-none',
                done
                  ? 'border-neo-lime text-neo-lime motion-safe:animate-[lc-tile-hit_200ms_ease-out]'
                  : i === state.filled
                    ? 'border-neo-cream text-neo-cream/35'
                    : 'border-dashed border-neo-cream/35 text-neo-cream/35'
              )}
            >
              {letter}
            </span>
          );
        })}
      </div>

      <div data-testid="warmup-spell-tiles" dir={dir} data-miss={state.misses} className="flex flex-wrap justify-center gap-1.5">
        {state.tiles.map((src, i) => {
          const used = state.used[i];
          const shaking = i === missTile;
          return (
            <button
              key={`${state.spelled}-${i}-${shaking ? state.misses : 0}`}
              type="button"
              data-letter={word[src]}
              data-used={used ? 'true' : 'false'}
              aria-hidden={used ? true : undefined}
              tabIndex={used ? -1 : undefined}
              aria-label={word[src]}
              onClick={() => tap(i)}
              className={cn(
                FOCUS,
                'grid size-11 place-items-center rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-xl font-black leading-none text-neo-black shadow-hard-sm transition-transform duration-100 motion-reduce:transition-none motion-safe:active:scale-90',
                used && 'invisible',
                shaking && 'border-neo-pink motion-safe:animate-[lc-tile-shake_220ms_ease-in-out]'
              )}
            >
              {word[src]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default WarmUpSpellTiles;
