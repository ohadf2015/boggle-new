'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { cn } from '@/lib/utils';

export const FINISH_BEAT_MS = 850;

interface Word {
  word: string;
  solved: boolean;
}

interface BridgeFinishBeatProps {
  planks: Word[];
  /** The pyramid's top word; the 5-riddle chain has none. */
  top?: Word | null;
  headline: string;
  onDone: () => void;
}

/** Shows the beat once, right at a fresh finish; never on a revisit or with reduced motion. */
export function useFinishBeat(fresh: boolean) {
  const reduced = useReducedMotion();
  const [finished, setFinished] = useState(false);
  const done = useCallback(() => setFinished(true), []);
  return { showing: fresh && !reduced && !finished, done };
}

const PLANK = 'rounded-neo border-3 border-neo-black px-3 py-1.5 font-neo-display text-lg font-black uppercase leading-none shadow-hard-sm';

/**
 * The bridge completing: each answer slams down as a plank, the last one
 * hardest, then the top word pops. Everything is on screen from the first
 * frame (transform only), and a tap goes straight to the results.
 */
export default function BridgeFinishBeat({ planks, top, headline, onDone }: BridgeFinishBeatProps) {
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(finish, FINISH_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  const last = planks.length - 1;
  const topDelay = 0.08 * planks.length + 0.12;

  return (
    <button
      type="button"
      data-testid="bridge-finish-beat"
      onClick={finish}
      className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-6 px-4"
    >
      <span className="text-xs font-black uppercase tracking-[0.2em] text-neo-purple">{headline}</span>

      {top && (
        <m.span
          data-testid="finish-top"
          initial={{ scale: 0.3, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING_PRESETS.bouncy, delay: topDelay }}
          className={cn(
            PLANK,
            'px-5 py-3 text-3xl shadow-hard-lg',
            top.solved ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white',
          )}
        >
          {top.word}
        </m.span>
      )}

      <div className="relative w-full">
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1.5 rounded-full bg-neo-cyan/40" />
        <div className="relative flex flex-wrap items-end justify-center gap-2 pb-3">
          {planks.map((p, i) => (
            <m.span
              key={`${p.word}-${i}`}
              data-testid="finish-plank"
              initial={{ y: -36, scale: i === last ? 1.8 : 1.4 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ ...SPRING_PRESETS.snappy, delay: 0.08 * i }}
              className={cn(PLANK, p.solved ? 'bg-neo-cream text-neo-black' : 'bg-neo-navy-light text-neo-white/60')}
            >
              {p.word}
            </m.span>
          ))}
        </div>
      </div>
    </button>
  );
}
