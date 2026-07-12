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
  solved: 'border-neo-lime bg-neo-lime/20 text-neo-lime',
  gaveUp: 'border-neo-red bg-neo-red/20 text-neo-red',
  current: 'border-neo-cyan bg-neo-cyan/10 text-neo-cyan',
  locked: 'border-neo-white/20 bg-neo-navy-light text-neo-white/40',
};

const BEAM_COLOR: Record<SlotState, string> = {
  solved: 'var(--neo-lime, #BFFF00)',
  gaveUp: 'var(--neo-red, #FF3366)',
  current: 'var(--neo-cyan, #00FFFF)',
  locked: 'rgba(255,255,255,0.15)',
};

// Slot centers in the 0–100 viewBox (3 × w-20 slots + 2 gaps ≈ 15.6 / 50 / 84.4%).
const BEAM_X = [16, 50, 84] as const;

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
        animate={finaleActive && !prefersReducedMotion ? { scale: [1, 1.06, 1] } : undefined}
        transition={finaleActive && !prefersReducedMotion ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
        className={[
          'relative z-10 min-w-24 h-12 px-3 rounded-neo border-neo-thick flex items-center justify-center font-neo-display font-black text-lg shadow-hard',
          won
            ? 'border-neo-yellow bg-neo-lime/20 text-neo-lime'
            : finaleActive
              ? 'border-neo-cyan bg-neo-cyan/10 text-neo-cyan'
              : 'border-neo-purple bg-neo-purple/15 text-neo-purple',
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

      {/* Beams — light up as each bridge feeds the apex */}
      <svg className="h-6 w-64 -my-0.5" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
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
              'w-20 h-12 rounded-neo border-neo-thick flex items-center justify-center font-neo-body text-xs font-bold text-center px-1.5 shadow-hard',
              SLOT_CLASS[state],
            ].join(' ')}
          >
            {solvedBridges[idx] || (state === 'current' ? '···' : '?')}
          </m.div>
        ))}
      </div>
    </div>
  );
}
