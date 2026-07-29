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
}

export default function ConnectionsProgressTrack({ total, currentIndex, solvedIndices, finished = false }: Props) {
  const nodes = buildProgressNodes(total, currentIndex, solvedIndices);
  const chest = chestState(solvedIndices.size, total, finished);

  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={solvedIndices.size} aria-valuemax={total}>
      {nodes.map((n, i) => (
        <div key={n.index} className="flex flex-1 items-center gap-1.5">
          <m.div
            initial={false}
            animate={{
              scale: n.state === 'current' ? [1, 1.12, 1] : 1,
            }}
            transition={n.state === 'current' ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            className={[
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 font-neo-display text-xs font-black',
              n.state === 'done'
                ? 'border-neo-lime bg-neo-lime text-neo-navy'
                : n.state === 'current'
                ? 'border-neo-cyan bg-neo-navy text-neo-cyan'
                : 'border-neo-white/25 bg-neo-navy text-neo-white/40',
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
                className="h-full origin-left bg-neo-lime"
              />
            </div>
          )}
        </div>
      ))}
      {/* chest at the end of the journey */}
      <div className="ml-0.5 shrink-0">
        <ChestArt state={chest} size={30} />
      </div>
    </div>
  );
}
