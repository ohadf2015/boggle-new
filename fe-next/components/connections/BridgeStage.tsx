'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import SparkBurst from './SparkBurst';
import { plateFitEms } from './plateFit';

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
 * The riddle as a place: two stone plates (the given words) and, between them, a
 * plank bridge over a river. The player's letter tiles sit on the deck; an arch
 * and two piers hold the deck up out of the water, two ropes tie it to the top
 * plate and the piers stand on the bottom plate. Narrow cards stack the parts; a
 * wide card (desktop, tablet) lays them out in a row.
 *
 * Layout is plain flex flow, no absolute positioning or negative margins, so
 * nothing can paint over the hint row above or the feedback line below. Every
 * vertical size is also capped by the stage height (`cqh` of the nearest
 * `container-type: size` ancestor, PuzzleCard's stage), so on a short screen with
 * the keyboard up the plates, tiles and river shrink instead of overflowing.
 * Outside a size container `cqh` falls back to `svh`, which only ever loosens it.
 *
 * On a solve the ropes pull taut in lime, the plates slam inward and a spark
 * burst fires; on a give-up the ropes cut to red. Nothing starts at `opacity: 0`:
 * an animation bundle that never loads must still leave a readable puzzle.
 */
const PLATE =
  'relative flex w-full items-center justify-center rounded-neo border-neo-thick border-neo-black bg-neo-cream px-3 py-[clamp(0.25rem,min(2.2cqi,2cqh),0.75rem)] text-center font-neo-display font-black uppercase leading-[1.05] tracking-wide text-neo-navy shadow-hard [overflow-wrap:break-word] text-balance text-[clamp(0.95rem,min(8.5cqi,13cqh,calc((100cqi-2.25rem)/var(--plate-fit))),2.25rem)] @max-[36rem]:[@media(min-height:780px)]:min-h-[min(4.75rem,19cqh)] @max-[36rem]:[@media(min-height:780px)]:text-[clamp(0.95rem,min(10cqi,13cqh,calc((100cqi-2.25rem)/var(--plate-fit))),2.75rem)] @min-[36rem]:min-h-[7rem] @min-[36rem]:text-[clamp(1rem,min(4.2cqi,calc((30cqi-2.25rem)/var(--plate-fit))),2.75rem)]';

/** Twisted-rope texture: diagonal strands in two warm tones, outlined in ink. */
const ROPE =
  'w-[9px] rounded-full border-x-2 border-neo-black bg-[repeating-linear-gradient(-50deg,var(--neo-cozy)_0_3px,var(--neo-cozy-dark)_3px_6px)]';
/** Stone pier texture: a solid post with mortar courses. */
const PIER =
  'w-[clamp(0.625rem,3.2cqi,0.875rem)] border-x-2 border-neo-black bg-[repeating-linear-gradient(180deg,var(--neo-cream)_0_7px,var(--neo-gray)_7px_8px)]';

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
      data-testid="bridge-stage"
      className="relative mx-auto flex w-full flex-col items-center @min-[36rem]:flex-row @min-[36rem]:items-center"
      style={{ containerType: 'inline-size' }}
    >
      <m.div {...plate(1, 0)} className="relative z-[1] w-full @min-[36rem]:flex @min-[36rem]:w-[30%] @min-[36rem]:shrink-0">
        <Plate word={word1} bob={!resolved && !reducedMotion} phase={0} />
      </m.div>

      <div
        data-testid="bridge-span"
        className="flex w-full max-w-[24rem] flex-col items-stretch @min-[36rem]:min-w-0 @min-[36rem]:max-w-none @min-[36rem]:flex-1 @min-[36rem]:px-3"
      >
        {/* Two ropes tie the deck to the top plate; they pull lime on a solve. */}
        <div
          aria-hidden="true"
          className="flex h-[clamp(0.5rem,min(7cqi,7cqh),2rem)] justify-between px-[7%] @max-[36rem]:[@media(min-height:780px)]:h-[clamp(0.5rem,min(9cqi,8cqh),2.5rem)] @min-[36rem]:hidden"
        >
          {[0, 1].map((i) => (
            <span key={i} data-testid="bridge-rope" className={`relative h-full ${ROPE}`}>
              {resolved && (
                <m.span
                  data-testid={i === 0 ? 'bridge-connector' : undefined}
                  initial={reducedMotion ? { scaleY: 1 } : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-0 origin-top ${isCorrect ? 'bg-neo-lime' : 'bg-neo-red'}`}
                />
              )}
            </span>
          ))}
        </div>

        {/* The deck: wooden planks the letter tiles sit on. */}
        <m.div
          data-testid="bridge-deck"
          initial={reducedMotion ? false : { scale: 0.92 }}
          animate={isCorrect && !reducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={isCorrect ? { duration: 0.35, delay: 0.3 } : { ...SLIDE, delay: 0.12 }}
          className={[
            'relative z-[1] rounded-[6px] border-neo-thick px-1.5 py-[clamp(0.125rem,1.2cqh,0.375rem)] shadow-hard transition-colors duration-300',
            'bg-[repeating-linear-gradient(90deg,var(--neo-cozy-muted)_0_22px,var(--neo-cozy-dark)_22px_24px)]',
            isCorrect ? 'border-neo-lime' : isGaveUp ? 'border-neo-red' : 'border-neo-black',
          ].join(' ')}
          style={{
            // Tiles never grow taller than the stage allows (AnswerSlots reads these caps).
            ['--cell-cap' as string]: 'min(2.5rem, 14cqh)',
            ['--cell-cap-tall' as string]: 'min(3rem, 14cqh)',
          }}
        >
          {/* Handrail: a thin cream rail along the deck's top edge. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-0.5 h-[3px] rounded-full bg-neo-cream/45" />
          <div className="relative">{children}</div>
          {isCorrect && <SparkBurst distance={140} />}
        </m.div>

        {/* Under the deck: arch + piers, standing in the river. */}
        <div
          aria-hidden="true"
          data-testid="bridge-river"
          className="relative flex h-[clamp(1.75rem,min(18cqi,17cqh),4.5rem)] justify-between overflow-hidden px-[7%] @max-[36rem]:[@media(min-height:780px)]:h-[clamp(1.75rem,min(20cqi,18cqh),5rem)]"
        >
          <BridgeArch />
          <span className={`relative h-full ${PIER}`} />
          <span className={`relative h-full ${PIER}`} />
          <RiverWaves flowing={!reducedMotion} />
        </div>
      </div>

      <m.div {...plate(-1, 0.06)} className="relative z-[1] w-full @min-[36rem]:flex @min-[36rem]:w-[30%] @min-[36rem]:shrink-0">
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
      <div data-testid="bridge-plate" className={PLATE} style={{ ['--plate-fit' as string]: plateFitEms(word) }}>
        {word}
      </div>
    </m.div>
  );
}

/**
 * The arch: a cream stone curve outlined in ink, from the water line up to the
 * deck, with spandrel posts carrying the deck. Pure decoration in its own box.
 */
const ARCH_POSTS = [0.22, 0.36, 0.5, 0.64, 0.78].map((t) => {
  const x = 10 + t * 180;
  // Quadratic arch from (10,40) through control (100,-16) to (190,40).
  const s = (x - 10) / 180;
  const y = (1 - s) * (1 - s) * 40 + 2 * (1 - s) * s * -16 + s * s * 40;
  return { x, y };
});

function BridgeArch() {
  return (
    <svg
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-[7%] top-0 h-full w-[86%] text-neo-black"
    >
      {ARCH_POSTS.map((p) => (
        <line key={p.x} x1={p.x} x2={p.x} y1={0} y2={p.y} stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      ))}
      <path d="M10 40 Q100 -16 190 40" fill="none" stroke="currentColor" strokeWidth="10" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      <path d="M10 40 Q100 -16 190 40" fill="none" stroke="var(--neo-cream)" strokeWidth="4.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}

const WAVE_BACK = 'M0 7 Q15 1 30 7 T60 7 T90 7 T120 7 V20 H0 Z';
const WAVE_FRONT = 'M0 9 Q10 4 20 9 T40 9 T60 9 T80 9 T100 9 T120 9 V20 H0 Z';

/**
 * The river: two filled wave layers drifting at different speeds (transform
 * only, two periods side by side sliding one period on a loop). Still under
 * prefers-reduced-motion.
 */
function RiverWaves({ flowing }: { flowing: boolean }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] overflow-hidden rounded-b-[6px]">
      {(
        [
          { d: WAVE_BACK, cls: 'text-neo-cyan-dark/70', dur: 9, dir: ['-50%', '0%'] },
          { d: WAVE_FRONT, cls: 'text-neo-cyan/50', dur: 6, dir: ['0%', '-50%'] },
        ] as const
      ).map((layer, li) => (
        <m.span
          key={li}
          animate={flowing ? { x: [...layer.dir] } : undefined}
          transition={flowing ? { duration: layer.dur, repeat: Infinity, ease: 'linear' } : undefined}
          className={`absolute bottom-0 left-0 flex w-[200%] ${li ? 'top-[30%]' : 'top-0'}`}
        >
          {[0, 1].map((i) => (
            <svg key={i} viewBox="0 0 120 20" preserveAspectRatio="none" className={`h-full w-[calc(50%+1px)] max-w-none shrink-0 ${layer.cls}`}>
              <path d={layer.d} fill="currentColor" />
            </svg>
          ))}
        </m.span>
      ))}
    </span>
  );
}
