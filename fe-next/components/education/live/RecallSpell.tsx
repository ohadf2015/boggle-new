'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { pulseLive } from '@/lib/education/liveHaptics';
import { WARM_UP_KEYFRAMES } from '@/components/education/lobby/WarmUpSpellTiles';
import { initialSpell, spellReducer, spellWordIsRtl } from '@/components/education/lobby/warmUpSpell';
import { PRESS } from './eduLiveStyles';

/** One slip is a typo; the second means the student is guessing, so the word goes back for another look. */
export const SPELL_MISSES_ALLOWED = 1;

interface RecallSpellProps {
  word: string;
  seed: number;
  onDone: (clean: boolean) => void;
}

export function RecallSpell({ word, seed, onDone }: RecallSpellProps) {
  const [state, setState] = useState(() => initialSpell([Array.from(word.trim().toLocaleUpperCase())], seed));
  const [missTile, setMissTile] = useState(-1);
  const sfx = useSoundEffects();
  const [reducedEffects] = useReducedEffects();
  const letters = state.words[0];
  const dir = spellWordIsRtl(letters) ? 'rtl' : 'ltr';
  const over = state.spelled > 0 || state.misses > SPELL_MISSES_ALLOWED;

  const tap = (tile: number) => {
    if (over) return;
    const next = spellReducer(state, { type: 'tap', tile });
    if (next === state) return;
    setState(next);
    if (!next.lastHit) {
      setMissTile(tile);
      if (next.misses > SPELL_MISSES_ALLOWED) onDone(false);
      return;
    }
    setMissTile(-1);
    const done = next.spelled > 0;
    if (done) sfx.playStreakMilestoneSound();
    else sfx.playTileSelectSound();
    pulseLive(done ? 'big' : 'valid', reducedEffects);
    if (done) onDone(true);
  };

  return (
    <div data-testid="recall-spell" className="flex flex-col gap-2">
      <style>{WARM_UP_KEYFRAMES}</style>
      <div dir={dir} className="flex flex-wrap justify-center gap-1">
        {letters.map((letter, i) => {
          const filled = i < state.filled;
          return (
            <span
              key={i}
              data-testid={`recall-spell-slot-${i}`}
              className={cn(
                'grid h-11 min-w-9 place-items-center rounded-neo border-2 bg-neo-navy-light px-1 font-neo-display text-xl font-black leading-none',
                filled
                  ? 'border-neo-lime text-neo-lime motion-safe:animate-[lc-tile-hit_200ms_ease-out]'
                  : i === state.filled
                    ? 'border-neo-cream text-transparent'
                    : 'border-dashed border-neo-cream/35 text-transparent'
              )}
            >
              {filled ? letter : ' '}
            </span>
          );
        })}
      </div>
      <div data-testid="recall-spell-tiles" dir={dir} className="flex flex-wrap justify-center gap-1.5">
        {state.tiles.map((src, i) => {
          const used = state.used[i];
          const shaking = i === missTile;
          return (
            <button
              key={`${i}-${shaking ? state.misses : 0}`}
              type="button"
              data-letter={letters[src]}
              data-used={used ? 'true' : 'false'}
              aria-hidden={used ? true : undefined}
              tabIndex={used ? -1 : undefined}
              aria-label={letters[src]}
              onClick={() => tap(i)}
              className={cn(
                'grid size-12 place-items-center rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-2xl font-black leading-none text-neo-black shadow-hard-sm hover:bg-neo-yellow',
                PRESS,
                used && 'invisible',
                shaking && 'border-neo-pink motion-safe:animate-[lc-tile-shake_220ms_ease-in-out]'
              )}
            >
              {letters[src]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
