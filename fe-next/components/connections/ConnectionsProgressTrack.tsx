'use client';

/**
 * The daily "journey" track — one filling node per puzzle, ending in a treasure
 * chest. Replaces the bare "1/5" text so the run feels like progress toward a
 * reward (chest glows when all solved, opens on finish). Neo-brutalist: hard
 * borders, electric fills.
 */
import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import { buildProgressNodes, chestState } from '@/lib/connections/progressTrack';
import { ChestArt } from './ConnectionsRewardArt';

interface Props {
  total: number;
  currentIndex: number;
  solvedIndices: ReadonlySet<number>;
  finished?: boolean;
  /** Per-puzzle difficulty — tints upcoming nodes so the run reads as a ramp. */
  difficulties?: readonly string[];
}

const TODO_TINT: Record<string, string> = {
  easy: 'border-neo-lime/70 text-neo-lime',
  medium: 'border-neo-cyan/70 text-neo-cyan',
  hard: 'border-neo-pink/70 text-neo-pink',
};

export default function ConnectionsProgressTrack({ total, currentIndex, solvedIndices, finished = false, difficulties }: Props) {
  const nodes = buildProgressNodes(total, currentIndex, solvedIndices);
  const chest = chestState(solvedIndices.size, total, finished);

  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={solvedIndices.size} aria-valuemax={total}>
      {nodes.map((n, i) => (
        <div key={n.index} className="flex flex-1 items-center gap-1.5">
          <m.div
            initial={false}
            animate={
              n.state === 'done'
                ? { scale: [1.45, 1], rotate: [-25, 0] }
                : { scale: n.state === 'current' ? 1.15 : 1 }
            }
            transition={
              n.state === 'done'
                ? { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }
                : { type: 'spring', stiffness: 300, damping: 18 }
            }
            className={[
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-neo-display text-xs font-black',
              n.state === 'done'
                ? 'border-neo-lime bg-neo-lime text-neo-navy'
                : n.state === 'current'
                ? 'border-neo-cyan bg-neo-cyan text-neo-navy shadow-hard-sm'
                : `bg-neo-navy ${TODO_TINT[difficulties?.[n.index] ?? ''] ?? 'border-neo-cream/40 text-neo-white/60'}`,
            ].join(' ')}
          >
            {n.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} aria-hidden="true" /> : n.index + 1}
          </m.div>
          {/* connector toward the next node */}
          {i < nodes.length - 1 && (
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-neo-white/15">
              <m.div
                initial={false}
                animate={{ scaleX: n.state === 'done' ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                className="h-full origin-left bg-neo-lime rtl:origin-right"
              />
            </div>
          )}
        </div>
      ))}
      {/* chest at the end of the journey */}
      <div className="ms-0.5 shrink-0">
        <ChestArt state={chest} size={30} />
      </div>
    </div>
  );
}
