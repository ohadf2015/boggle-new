'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import SparkBurst from './SparkBurst';

interface BridgeStageProps {
  word1: string;
  word2: string;
  isCorrect: boolean;
  isGaveUp: boolean;
  /** RTL flips which side each plate slides in from. */
  isRTL?: boolean;
  /** The plank row (answer slots / typed echo) that spans the gap. */
  children: ReactNode;
}

/**
 * The riddle as a place: two stone plates (the given words) with a river gap
 * between them that the player bridges, letter by letter. Narrow cards stack the
 * plates; a wide card (desktop, tablet) lays the bridge out in a row. On a solve the
 * ropes pull taut in lime, the plates slam inward and a spark burst fires; on
 * a give-up the ropes cut to red. Nothing starts at `opacity: 0` — an
 * animation bundle that never loads must still leave a readable puzzle.
 */
const PLATE =
  'relative z-10 flex w-full items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-cream px-3 py-[clamp(0.375rem,2.2cqi,0.75rem)] text-center font-neo-display font-black uppercase leading-none tracking-wide text-neo-navy shadow-hard [overflow-wrap:anywhere] text-[clamp(1.25rem,8.5cqi,2.25rem)] @min-[36rem]:min-h-[7rem] @min-[36rem]:text-[clamp(1.5rem,4.2cqi,2.75rem)]';

const SLIDE = { type: 'spring' as const, stiffness: 260, damping: 22 };

export default function BridgeStage({ word1, word2, isCorrect, isGaveUp, isRTL = false, children }: BridgeStageProps) {
  const reducedMotion = useReducedMotion();
  const resolved = isCorrect || isGaveUp;
  const from = isRTL ? -1 : 1;
  const plate = (side: 1 | -1, delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { x: side * from * -48, rotate: side * -3 },
          animate: isCorrect ? { x: [0, side * from * 10, 0], rotate: 0, scale: [1, 1.06, 1] } : { x: 0, rotate: 0 },
          transition: isCorrect ? { duration: 0.42, delay: 0.08 } : { ...SLIDE, delay },
        };

  return (
    <div
      className="relative mx-auto flex w-full flex-col items-center @min-[36rem]:flex-row @min-[36rem]:items-stretch"
      style={{ containerType: 'inline-size' }}
    >
      <m.div {...plate(1, 0)} className="w-full @min-[36rem]:flex @min-[36rem]:w-[30%] @min-[36rem]:shrink-0">
        <Plate word={word1} bob={!resolved && !reducedMotion} phase={0} />
      </m.div>

      <div className="relative -my-1 w-full py-[clamp(0.75rem,5cqi,1.75rem)] @min-[36rem]:-mx-1 @min-[36rem]:my-0 @min-[36rem]:flex @min-[36rem]:flex-1 @min-[36rem]:items-center @min-[36rem]:px-5 @min-[36rem]:py-0">
        {/* Two ropes tie the plates together; they pull lime on a solve. */}
        {(['start-[14%] inset-y-0 w-1 @min-[36rem]:inset-x-0 @min-[36rem]:start-0 @min-[36rem]:top-[18%] @min-[36rem]:bottom-auto @min-[36rem]:h-1 @min-[36rem]:w-auto',
          'end-[14%] inset-y-0 w-1 @min-[36rem]:inset-x-0 @min-[36rem]:end-0 @min-[36rem]:top-auto @min-[36rem]:bottom-[18%] @min-[36rem]:h-1 @min-[36rem]:w-auto'] as const).map((pos, i) => (
          <span key={i} aria-hidden="true" className={`absolute ${pos}`}>
            <span className="absolute inset-0 border-s-4 border-dashed border-neo-cream/50 @min-[36rem]:border-s-0 @min-[36rem]:border-t-4" />
            {resolved && (
              <m.span
                data-testid={i === 0 ? 'bridge-connector' : undefined}
                initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute inset-0 origin-top @min-[36rem]:origin-[0%_50%] rtl:@min-[36rem]:origin-[100%_50%] ${isCorrect ? 'bg-neo-lime' : 'bg-neo-red'}`}
              />
            )}
          </span>
        ))}

        <m.div
          initial={reducedMotion ? false : { scale: 0.92 }}
          animate={isCorrect && !reducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={isCorrect ? { duration: 0.35, delay: 0.3 } : { ...SLIDE, delay: 0.12 }}
          className={[
            'relative z-10 mx-auto w-full max-w-[22rem] rounded-neo border-2 bg-neo-navy px-3 py-[clamp(0.375rem,2.5cqi,0.75rem)] shadow-hard-sm transition-colors duration-300 @min-[36rem]:max-w-none',
            isCorrect ? 'border-neo-lime' : 'border-neo-cream/40',
          ].join(' ')}
        >
          <RiverWaves flowing={!reducedMotion} />
          <div className="relative">{children}</div>
          {isCorrect && <SparkBurst distance={140} />}
        </m.div>
      </div>

      <m.div {...plate(-1, 0.06)} className="w-full @min-[36rem]:flex @min-[36rem]:w-[30%] @min-[36rem]:shrink-0">
        <Plate word={word2} bob={!resolved && !reducedMotion} phase={1.3} />
      </m.div>
    </div>
  );
}

/** A plate that breathes (a slow 3px drift, transform only) while the riddle is open. */
function Plate({ word, bob, phase }: { word: string; bob: boolean; phase: number }) {
  return (
    <m.div
      animate={bob ? { y: [0, -3, 0] } : { y: 0 }}
      transition={bob ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: phase } : { duration: 0.2 }}
      className="flex w-full"
    >
      <div className={PLATE}>{word}</div>
    </m.div>
  );
}

const WAVE = 'M0 8 Q10 0 20 8 T40 8 T60 8 T80 8 T100 8 T120 8 M0 18 Q10 10 20 18 T40 18 T60 18 T80 18 T100 18 T120 18';

/** The river the bridge crosses: two wave periods side by side, sliding one period on a loop. */
function RiverWaves({ flowing }: { flowing: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 overflow-hidden rounded-b-neo">
      <m.span
        animate={flowing ? { x: ['0%', '-50%'] } : undefined}
        transition={flowing ? { duration: 7, repeat: Infinity, ease: 'linear' } : undefined}
        className="flex h-full w-[200%]"
      >
        {[0, 1].map((i) => (
          <svg key={i} viewBox="0 0 120 24" preserveAspectRatio="none" className="h-full w-1/2 max-w-none shrink-0 text-neo-cyan/35">
            <path d={WAVE} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ))}
      </m.span>
    </span>
  );
}
