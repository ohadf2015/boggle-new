'use client';

import { cn } from '@/lib/utils';
import { candyKey, type CandyHue } from './candyKey';

export type SpellingTilesState = 'typing' | 'correct' | 'wrong';

interface SpellingTilesProps {
  /** Length of the word being spelled: one slot per letter. */
  length: number;
  /** Letters given away so far (the first letter is always free). */
  hint: string;
  /** What the student has typed into the box. */
  typed: string;
  state: SpellingTilesState;
  /** The right spelling, shown on the tiles once the answer is in. */
  answer?: string;
}

/** Extra slots shown when a student types past the end of the word. */
const MAX_OVERFLOW = 3;

/*
 * The word as a row of letter tiles that fill while the student types, instead
 * of a line of underscores. On a right answer the tiles turn lime and hop one
 * after another; on a wrong one they turn to the real spelling.
 *
 * Text content stays "hint letters + one _ per blank" (typed and revealed
 * letters are drawn from `data-letter` by CSS). That keeps what a screen reader
 * hears unchanged, since the input itself carries the typed value, and keeps
 * the blank count the rest of the drill relies on.
 */
export function SpellingTiles({ length, hint, typed, state, answer }: SpellingTilesProps) {
  const settled = state !== 'typing' && answer;
  const overflow = state === 'typing' ? Math.min(MAX_OVERFLOW, Math.max(0, typed.length - length)) : 0;
  const slots = length + overflow;
  const compact = slots > 8;

  return (
    <div
      data-testid="spelling-tiles"
      data-state={state}
      dir="auto"
      className={cn(
        'flex min-w-0 flex-1 flex-nowrap items-center justify-center',
        compact ? 'gap-1' : 'gap-1.5',
        state === 'wrong' && 'motion-safe:animate-neo-shake'
      )}
    >
      {Array.from({ length: slots }, (_, i) => {
        const hinted = hint[i];
        const typedCh = typed[i];
        const shown = settled ? answer?.[i] : typedCh;
        const isOverflow = i >= length;

        let hue: CandyHue | null = null;
        if (state === 'correct') hue = 'lime';
        else if (state === 'wrong') hue = 'cream';
        else if (isOverflow) hue = 'pink';
        else if (typedCh) hue = hinted && typedCh.toLowerCase() === hinted.toLowerCase() ? 'gold' : 'cream';
        else if (hinted) hue = 'gold';

        return (
          <span
            key={i}
            data-slot={hue ? 'filled' : 'empty'}
            data-letter={shown ?? ''}
            style={{
              ...(hue ? candyKey(hue) : undefined),
              ...(state === 'correct' ? { animationDelay: `${i * 55}ms` } : undefined),
            }}
            className={cn(
              'relative flex aspect-square min-w-0 basis-11 items-center justify-center rounded-lg font-neo-display font-black uppercase leading-none text-neo-navy',
              compact ? 'text-lg @3xl:basis-12 @3xl:text-2xl' : 'text-2xl @3xl:basis-16 @3xl:text-4xl',
              // A tile you can point at reacts, so the row feels touchable on desktop.
              'transition-transform duration-150 hover:-translate-y-0.5',
              !hue && 'border-2 border-dashed border-neo-cream/50 bg-neo-white/5',
              // The typed / revealed letter is drawn here, so it never adds to the text content.
              shown && 'before:content-[attr(data-letter)]',
              typedCh && state === 'typing' && 'motion-safe:animate-[lc-tile-pop_170ms_cubic-bezier(.34,1.56,.64,1)]',
              state === 'correct' && 'motion-safe:animate-[lc-tile-hop_420ms_cubic-bezier(.34,1.56,.64,1)_both]',
              state === 'wrong' && 'motion-safe:animate-[lc-tile-flip_360ms_ease-out_both]'
            )}
          >
            {shown ? null : hinted ? hinted : <span className="opacity-0">_</span>}
          </span>
        );
      })}
    </div>
  );
}

/** Rendered once by the drill root (a <style> inside the tiles would leak into their text). */
export const TILE_KEYFRAMES =
  '@keyframes lc-tile-pop{0%{transform:scale(.6)}100%{transform:scale(1)}}' +
  '@keyframes lc-tile-hop{0%{transform:translateY(0) scale(1)}40%{transform:translateY(-12px) scale(1.12) rotate(-4deg)}100%{transform:translateY(0) scale(1)}}' +
  '@keyframes lc-tile-flip{0%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}';

export default SpellingTiles;
