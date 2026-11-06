'use client';

import { m } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface PyramidProgressProps {
  stage: number;
  solvedBridges: string[];
  gaveUpBase: [boolean, boolean, boolean];
  metaAnswer: string;
  won: boolean;
}

type SlotState = 'solved' | 'gaveUp' | 'current' | 'locked';

const SLOT_CLASS: Record<SlotState, string> = {
  solved: 'border-neo-black bg-neo-lime text-neo-navy',
  gaveUp: 'border-neo-black bg-neo-red text-neo-white',
  current: 'border-neo-cyan bg-neo-navy text-neo-cyan',
  locked: 'border-neo-cream/40 bg-neo-navy-light text-neo-white/60',
};

const BEAM_COLOR: Record<SlotState, string> = {
  solved: 'var(--neo-lime, #BFFF00)',
  gaveUp: 'var(--neo-red, #FF3366)',
  current: 'var(--neo-cyan, #00FFFF)',
  // 0.15 vanished on phone screens: the unlit beams read as a broken drawing.
  locked: 'rgba(255,255,255,0.3)',
};

// Slot centers in the 0–100 viewBox: the beams SVG spans exactly the base row
// (3 equal slots + 2 gap-2 gaps ≈ 15.6 / 50 / 84.4%).
const BEAM_X = [16, 50, 84] as const;

// Phone fit: the `[@container(max-height:42rem)]:` classes below apply only
// inside the play screen's size container (PyramidChallenge root). A short
// screen shrinks the apex, beams and slots so the keyboard below stays on
// screen; results/end screens have no such container and keep full size.
// Written out in full (no interpolation) so Tailwind's scanner sees them.

/**
 * The pyramid IS the scoreboard: apex (finale word) on top, 3 base slots
 * below, connected by beams that light up as each bridge is solved — the
 * "answers flow up to unlock the top" mechanic drawn literally. Always fully
 * visible; before the 2026-07-13 rebuild the apex only appeared at the
 * finale, so the mode's goal was invisible during play.
 */
export default function PyramidProgress({
  stage,
  solvedBridges,
  gaveUpBase,
  metaAnswer,
  won,
}: PyramidProgressProps) {
  const prefersReducedMotion = useReducedMotion();
  const finaleActive = stage === 3 && !won;

  const slotState = (idx: number): SlotState => {
    if (gaveUpBase[idx]) return 'gaveUp';
    if (solvedBridges[idx]) return 'solved';
    if (idx === stage) return 'current';
    return 'locked';
  };
  const states = [0, 1, 2].map(slotState);

  return (
    <div className="flex flex-col items-center" aria-label={`${solvedBridges.filter(Boolean).length} / 3`}>
      {/* Apex — the goal word */}
      <m.div
        data-testid="pyramid-apex"
        animate={finaleActive && !prefersReducedMotion ? { scale: 1.08 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className={[
          'relative z-10 min-w-24 h-12 [@container(max-height:42rem)]:h-9 [@container(max-height:42rem)]:text-base px-3 rounded-neo border-neo-thick flex items-center justify-center font-neo-display font-black text-lg shadow-hard',
          won
            ? 'border-neo-black bg-neo-yellow text-neo-navy'
            : finaleActive
              ? 'border-neo-cyan bg-neo-navy text-neo-cyan'
              : 'border-neo-purple bg-neo-navy text-neo-purple-light',
        ].join(' ')}
      >
        {won ? (
          <m.span
            initial={prefersReducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          >
            {metaAnswer}
          </m.span>
        ) : (
          '?'
        )}
      </m.div>

      {/* The beams and the slot row share one box, so the beams always span
          exactly the slots they point at (the rail zooms and resizes them). */}
      <div className="flex flex-col items-stretch">
      {/* Beams — light up as each bridge feeds the apex. The slot row follows the
          page direction (stage 1 is rightmost in Hebrew), so the beams mirror with
          it; unmirrored, the lit beam pointed at the wrong slot in RTL. */}
      <svg
        data-testid="pyramid-beams"
        className="h-6 [@container(max-height:42rem)]:h-4 w-0 min-w-full -my-0.5 rtl:-scale-x-100"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {BEAM_X.map((x, idx) => (
          <line
            key={idx}
            x1="50"
            y1="0"
            x2={x}
            y2="24"
            stroke={BEAM_COLOR[states[idx]]}
            strokeWidth={states[idx] === 'solved' || won ? 3 : 2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Base: the 3 bridge slots */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {states.map((state, idx) => (
          <m.div
            key={idx}
            data-testid={state === 'current' ? 'pyramid-slot-current' : `pyramid-slot-${idx}`}
            animate={
              state === 'solved' && !prefersReducedMotion && solvedBridges[idx]
                ? { scale: [1.15, 1] }
                : undefined
            }
            transition={{ type: 'spring', stiffness: 340, damping: 18 }}
            className={[
              'w-20 h-12 [@container(max-height:42rem)]:h-9 rounded-neo border-neo-thick flex items-center justify-center font-neo-body text-xs font-bold leading-tight text-center px-1.5 shadow-hard',
              SLOT_CLASS[state],
            ].join(' ')}
          >
            {solvedBridges[idx] || (state === 'current' ? '···' : '?')}
          </m.div>
        ))}
      </div>
      </div>
    </div>
  );
}
