'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import SparkBurst from './SparkBurst';

interface BridgeStageProps {
  word1: string;
  word2: string;
  isCorrect: boolean;
  isGaveUp: boolean;
  /** The plank row (answer slots / typed echo) that spans the gap. */
  children: ReactNode;
}

/**
 * The riddle as a place: two stone plates (the given words) with a river gap
 * between them that the player bridges, letter by letter. On a solve the
 * ropes pull taut in lime, the plates bump and a spark burst fires; on a
 * give-up the ropes cut to red. Nothing starts at `opacity: 0` — an animation
 * bundle that never loads must still leave a readable puzzle.
 */
const PLATE =
  'relative z-10 w-full rounded-neo border-neo-thick border-neo-black bg-neo-cream px-3 py-2.5 text-center font-neo-display font-black uppercase leading-none tracking-wide text-neo-navy shadow-hard [overflow-wrap:anywhere] text-[clamp(1.25rem,9cqi,2.25rem)]';

const BUMP = { scale: [1, 1.05, 1] };

export default function BridgeStage({ word1, word2, isCorrect, isGaveUp, children }: BridgeStageProps) {
  const reducedMotion = useReducedMotion();
  const resolved = isCorrect || isGaveUp;
  const bump = isCorrect && !reducedMotion ? BUMP : undefined;

  return (
    <div className="relative mx-auto flex w-full flex-col items-center" style={{ containerType: 'inline-size' }}>
      <m.div animate={bump} transition={{ duration: 0.4, delay: 0.1 }} className="w-full">
        <div className={PLATE}>{word1}</div>
      </m.div>

      <div className="relative -my-1 w-full py-7">
        {/* Two ropes tie the plates together; they pull lime on a solve. */}
        {(['start-[14%]', 'end-[14%]'] as const).map((side, i) => (
          <span key={side} aria-hidden="true" className={`absolute inset-y-0 ${side} w-1`}>
            <span className="absolute inset-0 border-s-4 border-dashed border-neo-cream/50" />
            {resolved && (
              <m.span
                data-testid={i === 0 ? 'bridge-connector' : undefined}
                initial={reducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute inset-0 origin-top border-neo-black ${isCorrect ? 'bg-neo-lime' : 'bg-neo-red'}`}
              />
            )}
          </span>
        ))}

        <div className="relative z-10 mx-auto w-full max-w-[22rem] rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-3 shadow-hard-sm">
          <RiverWaves />
          <div className="relative">{children}</div>
          {isCorrect && <SparkBurst />}
        </div>
      </div>

      <m.div animate={bump} transition={{ duration: 0.4, delay: 0.18 }} className="w-full">
        <div className={PLATE}>{word2}</div>
      </m.div>
    </div>
  );
}

/** Static wave texture under the planks — the river the bridge crosses. */
function RiverWaves() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 24"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-5 w-full text-neo-cyan/35"
    >
      <path
        d="M0 8 Q10 0 20 8 T40 8 T60 8 T80 8 T100 8 T120 8 M0 18 Q10 10 20 18 T40 18 T60 18 T80 18 T100 18 T120 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
