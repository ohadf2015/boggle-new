import { memo, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import {
  buildLeaderboardView,
  type RosterPlayerInput,
  type PrevSnapshotEntry,
} from './leaderboardView';

// Back-compat alias: adapters import `{ RosterRail, type RosterPlayer }`.
export type RosterPlayer = RosterPlayerInput;

/**
 * Live MP leaderboard for the desktop shell's left rail.
 *
 * "Live" = three transient, self-resolving signals layered over a sorted list:
 *  - rows spring to their new position when ranks change (Framer `layout`),
 *  - a score badge pops when that player just scored (`scoreDelta`),
 *  - the current leader wears a gold crown (`isLeader`).
 *
 * All sort/delta/leader logic lives in the pure `buildLeaderboardView`
 * (unit-tested); this component only renders + animates. Reduced-motion users
 * get the same data with every animation disabled.
 */
function RosterRailImpl({ players }: { players: RosterPlayer[] }) {
  const reduce = useReducedMotion();
  const prevRef = useRef<Map<string, PrevSnapshotEntry>>(new Map());

  // Compare against the previous commit's snapshot, then stash this one *after*
  // commit. Reading and writing the ref in the same render would zero every
  // delta (render N would compare against itself).
  const { rows, snapshot } = buildLeaderboardView(players, prevRef.current);
  useEffect(() => {
    prevRef.current = snapshot;
  }, [snapshot]);

  const rowTransition = reduce
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 600, damping: 44 } as const);

  return (
    <ul className="flex flex-col gap-2" data-component="roster-rail" aria-label="Players">
      {rows.map((p) => (
        <motion.li
          key={p.userId}
          layout={!reduce}
          transition={rowTransition}
          data-testid={`roster-row-${p.userId}`}
          data-row="true"
          data-you={p.isYou ? 'true' : 'false'}
          data-rank={p.rank}
          data-leader={p.isLeader ? 'true' : 'false'}
          data-rank-delta={p.rankDelta}
          className={[
            'flex flex-col gap-1.5 p-2.5 border-2 rounded-lg',
            p.isLeader ? 'border-neo-yellow bg-neo-yellow/10' : 'border-foreground bg-card',
            p.isYou ? 'ring-2 ring-neo-cyan' : '',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs w-5 flex items-center justify-center shrink-0">
              {p.isLeader ? (
                <>
                  <Crown className="w-4 h-4 text-neo-yellow fill-neo-yellow" aria-hidden="true" />
                  {/* keep the rank readable to screen readers (crown is decorative) */}
                  <span className="sr-only">{p.rank}</span>
                </>
              ) : (
                <span className="opacity-50">{p.rank}</span>
              )}
            </span>
            <div className="relative shrink-0">
              <Avatar size="sm" customAvatar={p.customAvatar ?? undefined} userId={p.userId} disableEffects />
              <span
                data-testid={`status-dot-${p.userId}`}
                data-status={p.status}
                className={`absolute bottom-0 end-0 w-2 h-2 rounded-full border border-background ${p.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`}
                aria-label={p.status}
              />
            </div>
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.username}</span>
            <div className="flex flex-col items-end shrink-0">
              <motion.span
                // Remounting on score change replays the pop; `initial={false}`
                // keeps it silent on first paint and on non-scoring re-renders.
                key={p.score}
                initial={!reduce && p.scoreDelta > 0 ? { scale: 1.4 } : false}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
                className="font-bold tabular-nums text-sm"
              >
                {p.score}
              </motion.span>
              {p.wordCount != null && p.wordCount > 0 && (
                <span className="text-[10px] opacity-50 tabular-nums">{p.wordCount}w</span>
              )}
            </div>
          </div>
          <div className="ms-7 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${p.isLeader ? 'bg-neo-yellow' : p.isYou ? 'bg-neo-cyan' : 'bg-neo-lime/60'}`}
              style={{ width: `${p.pctOfMax}%` }}
              aria-hidden="true"
            />
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

export const RosterRail = memo(RosterRailImpl);
