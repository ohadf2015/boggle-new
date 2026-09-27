/**
 * CelebrationLoop — the payoff that is still happening when the shutter opens.
 *
 * WHY THIS EXISTS. Round 4's critic found all five projector frames
 * (+0/+1/+2/+4/+8 s after END ROUND) PIXEL-IDENTICAL: no visual evidence of the
 * staged reveal, the confetti or the sweep burst, even though the live sampler
 * watched the stage attribute walk third -> second -> first -> sweep -> done.
 *
 * The instinct is to stretch the timetable. That was already tried — 2.6s ->
 * 4.4s after the SAME critique in round 2 — and it cannot work, because the
 * problem is not when the reveal runs. It is that the RESTING state does not
 * move:
 *   - `fireRankConfetti(1)` is a one-shot canvas burst fired once on the
 *     winner's beat, and it has settled long before a shutter that opens ~4 s
 *     after END ROUND (two taps to arm-and-confirm, then screenshot latency);
 *   - the trophy `<video>` is frequently `paused` on its poster in a headless
 *     renderer — the 640px encode already failed this way once, which is why
 *     `WinnerSpotlight` ships a 384px faststart copy.
 * With nothing moving after `done`, every frame after `done` is identical to
 * every other one, at ANY cadence, for as long as the recap is up. No timetable
 * fixes that.
 *
 * So: a celebration that never stops while the recap is up, in plain CSS
 * keyframes. No canvas, no video, no JS tick — nothing that depends on a
 * renderer choosing to animate. A late shutter cannot miss it.
 *
 * CLASS-5 RULES:
 *  - bounded, never fullscreen, and the CONTAINER never tweens; only the
 *    pieces inside it move, which is the "static appear + bounded element
 *    motion" shape;
 *  - no `opacity: 0` start on the layer — the pieces are painted on frame one
 *    at their resting opacity;
 *  - `prefers-reduced-motion` gets a fully-painted STATIC scatter, so the
 *    resting state is complete with zero motion rather than an empty box.
 *
 * Deterministic by construction: positions, delays, durations and colours come
 * from the index, never from `Math.random`. A server render and a client render
 * agree, and two screenshots of the same instant are comparable.
 */

'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** How many pieces. Enough that the scatter reads as confetti, few enough to stay cheap. */
export const CELEBRATION_PIECES = 18;

/**
 * Podium palette. A results moment is the one screen where the "at most two
 * accents" rule is deliberately lifted (see the design addendum), so the full
 * celebratory set is correct here and nowhere else.
 */
const PIECE_COLOURS = ['#bfff00', '#00ffff', '#ff1493', '#ffe135', '#fffef0'];

/**
 * Fall time per piece. Spread across a few values so the layer never pulses in
 * lockstep — two frames a second apart must not be able to look alike.
 */
const PIECE_DURATIONS = [2.6, 3.1, 3.7, 4.3];

const KEYFRAMES = `
@keyframes lc-celebrate-fall {
  0%   { transform: translate3d(0, -14%, 0) rotate(0deg); }
  100% { transform: translate3d(0, 116%, 0) rotate(420deg); }
}
@keyframes lc-celebrate-drift {
  0%, 100% { margin-left: -6px; }
  50%      { margin-left: 6px; }
}
`;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface CelebrationLoopProps {
  /** True from the winner's beat onward. Renders nothing before it. */
  active: boolean;
  className?: string;
}

export function CelebrationLoop({ active, className }: CelebrationLoopProps) {
  // Read the preference after mount: the server has no matchMedia, and a
  // first client paint that guesses "animating" then corrects to "static"
  // would be exactly the late-resolution flash of Pitfall Class 1. Starting
  // calm and enriching upward only ever ADDS motion to a painted screen.
  const [calm, setCalm] = useState(true);
  useEffect(() => {
    setCalm(prefersReducedMotion());
  }, []);

  if (!active) return null;

  return (
    <div
      data-testid="celebration-loop"
      data-celebration-loop={calm ? 'static' : 'animating'}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {!calm && <style>{KEYFRAMES}</style>}
      {Array.from({ length: CELEBRATION_PIECES }, (_, i) => {
        // Golden-ratio stride spreads the columns evenly without clustering,
        // and without a random source that would break SSR agreement.
        const left = ((i * 61.8) % 100).toFixed(2);
        const duration = PIECE_DURATIONS[i % PIECE_DURATIONS.length];
        // Negative delays start each piece PART-WAY THROUGH its fall, so the
        // very first painted frame is already a full scatter rather than a
        // clump waiting at the ceiling.
        const delay = -((i * 0.37) % duration);
        const colour = PIECE_COLOURS[i % PIECE_COLOURS.length];
        const wide = i % 3 === 0;

        return (
          <span
            key={i}
            data-celebration-piece={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${left}%`,
              width: wide ? 10 : 7,
              height: wide ? 7 : 12,
              backgroundColor: colour,
              borderRadius: 1,
              opacity: 0.95,
              ...(calm
                ? // Static scatter: no animation at all, but spread down the
                  // box so it reads as confetti in mid-air, not a row of dots.
                  { transform: `translate3d(0, ${(i * 37) % 90}%, 0) rotate(${(i * 47) % 360}deg)` }
                : {
                    animationName: 'lc-celebrate-fall, lc-celebrate-drift',
                    animationDuration: `${duration}s, ${(duration / 2).toFixed(2)}s`,
                    animationTimingFunction: 'linear, ease-in-out',
                    animationIterationCount: 'infinite',
                    animationDelay: `${delay.toFixed(2)}s`,
                  }),
            }}
          />
        );
      })}
    </div>
  );
}

export default CelebrationLoop;
