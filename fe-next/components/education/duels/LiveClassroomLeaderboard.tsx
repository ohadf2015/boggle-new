'use client';

/**
 * LiveClassroomLeaderboard — the live standings of a classroom round.
 *
 *  - `projector`: the room's top N, legible from the back row, re-sorted with
 *    an animated rank swap (the shared `LeaderboardRowReorder` FLIP) whenever
 *    a score moves. Sized to fit its panel at 1920×1080 without scrolling.
 *  - `phone`: ME and the classmate on either side of me, as one compact strip.
 *    No absolute place and no class size — the student HUD's standing rule
 *    (see StudentRankRail): a relative neighbour keeps the pull of a rival
 *    without publishing "#24 / 28".
 *
 * The data is the server's leaderboard payload (`updateLeaderboard`, restored
 * inside the reconnect `startGame`); nothing here computes a score. A score
 * going UP is a correct answer: that row bursts (bounded), pops "+N" and plays
 * the mode sting. Scores already present on first paint — a refresh restoring
 * the board — are not news and do not celebrate. The host never appears: a
 * classroom teacher projects, she does not play.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { LeaderboardRowReorder } from '@/components/motion/LeaderboardRowReorder';
import { useModeSting } from '@/hooks/useModeSting';
import { ScoreSparkBurst } from './ScoreSparkBurst';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

export type LeaderboardVariant = 'phone' | 'projector';

/** The slice of a server leaderboard row this board reads. */
export interface LiveBoardEntry {
  username: string;
  score: number;
  isHost?: boolean;
}

export interface LiveClassroomLeaderboardProps {
  leaderboard: ReadonlyArray<LiveBoardEntry>;
  /** Whose phone this is (phone variant). */
  currentPlayer?: string;
  variant?: LeaderboardVariant;
  /** Rows on the projector (default 8 — what fits a 1080p half-panel). */
  topN?: number;
  /** Mode for the sting. */
  gameMode?: string | null;
  className?: string;
}

/** How long a burst / "+N" stays up. */
const POP_MS = 900;
/** The projector stings at most once per window — 30 phones scoring at once is one cheer, not 30. */
const STING_WINDOW_MS = 1200;

interface Pop {
  delta: number;
  id: number;
}

let popSeq = 0;

/**
 * Per-player score increases since the previous payload. The first payload
 * seen is the baseline, so a restored board never fires.
 */
function useScorePops(
  entries: ReadonlyArray<LiveBoardEntry>,
  onIncrease: (pops: Record<string, Pop>) => void
): Record<string, Pop> {
  const prevRef = useRef<Map<string, number> | null>(null);
  const onIncreaseRef = useRef(onIncrease);
  onIncreaseRef.current = onIncrease;
  const [pops, setPops] = useState<Record<string, Pop>>({});

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = new Map(entries.map((e) => [e.username, e.score]));
    if (!prev) return;
    const ups: Record<string, Pop> = {};
    for (const e of entries) {
      const before = prev.get(e.username);
      if (before !== undefined && e.score > before) ups[e.username] = { delta: e.score - before, id: ++popSeq };
    }
    if (Object.keys(ups).length === 0) return;
    setPops((p) => ({ ...p, ...ups }));
    onIncreaseRef.current(ups);
    const ids = new Set(Object.values(ups).map((u) => u.id));
    const timer = setTimeout(() => {
      setPops((p) => {
        const next: Record<string, Pop> = {};
        for (const [name, pop] of Object.entries(p)) if (!ids.has(pop.id)) next[name] = pop;
        return next;
      });
    }, POP_MS);
    return () => clearTimeout(timer);
  }, [entries]);

  return pops;
}

/** "+N" that rises off a projector score. Transform-led, bounded to the row. */
function ScorePop({ pop }: { pop: Pop }) {
  return (
    <AdaptiveMotion.span
      key={pop.id}
      data-testid="live-board-pop"
      initial={{ y: 6, scale: 0.6, opacity: 0 }}
      animate={{ y: -18, scale: 1.1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      className={cn(
        'pointer-events-none absolute -top-2 end-1 z-10 rounded-neo border-2 border-neo-black bg-neo-lime',
        'px-2 py-0.5 font-neo-display text-2xl font-black text-neo-black tabular-nums shadow-hard-sm'
      )}
    >
      {`+${pop.delta}`}
    </AdaptiveMotion.span>
  );
}

function PhoneStrip({
  rows,
  me,
  pops,
  pointsLabel,
  dir,
  className,
}: {
  rows: ReadonlyArray<LiveBoardEntry>;
  me: string;
  pops: Record<string, Pop>;
  pointsLabel: string;
  dir: 'ltr' | 'rtl';
  className?: string;
}) {
  const myIndex = rows.findIndex((r) => r.username === me);
  if (myIndex === -1) return null;
  const view = rows.slice(Math.max(0, myIndex - 1), myIndex + 2);

  return (
    <div dir={dir} className={cn('flex items-stretch justify-center gap-1.5', className)}>
      {view.map((row) => {
        const isMe = row.username === me;
        const above = rows.indexOf(row) < myIndex;
        const pop = pops[row.username];
        const Icon = isMe ? null : above ? ChevronUp : ChevronDown;
        return (
          <AdaptiveMotion.div
            key={row.username}
            layout
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            data-testid="live-board-row"
            data-player={row.username}
            data-me={String(isMe)}
            className={cn(
              'relative flex min-w-0 items-center gap-1 rounded-neo border-neo px-2 py-1 shadow-hard-sm select-none',
              'font-neo-display',
              isMe
                ? 'max-w-[9.5rem] bg-neo-cyan text-neo-black border-neo-black'
                : 'max-w-[7.5rem] bg-neo-navy-light text-neo-cream border-neo-cream/40'
            )}
          >
            {pop && <ScoreSparkBurst id={pop.id} />}
            {Icon && <Icon className="relative h-3 w-3 shrink-0" aria-hidden="true" />}
            <span className="relative truncate text-xs font-black">{row.username}</span>
            <AdaptiveMotion.span
              key={pop?.id ?? 'still'}
              initial={pop ? { scale: 1.45 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
              className="relative text-xs font-black tabular-nums"
            >
              {row.score}
            </AdaptiveMotion.span>
            {isMe && (
              <span className="relative text-[9px] font-bold uppercase tracking-wide opacity-80">{pointsLabel}</span>
            )}
          </AdaptiveMotion.div>
        );
      })}
    </div>
  );
}

function ProjectorBoard({
  rows,
  pops,
  pointsLabel,
  dir,
  className,
}: {
  rows: ReadonlyArray<LiveBoardEntry>;
  pops: Record<string, Pop>;
  pointsLabel: string;
  dir: 'ltr' | 'rtl';
  className?: string;
}) {
  const reorderRows = useMemo(() => rows.map((r) => ({ ...r, id: r.username })), [rows]);
  return (
    <div dir={dir} className={className}>
      <LeaderboardRowReorder
        rows={reorderRows}
        renderRow={(row, index) => {
          const rank = index + 1;
          const pop = pops[row.username];
          return (
            <div className="py-1.5">
              <BoundedConfettiBurst trigger={!!pop} size="md">
                <div
                  data-testid="live-board-row"
                  data-player={row.username}
                  className={cn(
                    'relative flex items-center gap-4 rounded-neo border-4 px-5 py-3 shadow-hard',
                    'bg-neo-navy text-neo-cream',
                    rank === 1 ? 'border-neo-yellow' : rank <= 3 ? 'border-neo-lime' : 'border-neo-black'
                  )}
                >
                  <span
                    data-testid="live-board-rank"
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black',
                      'font-neo-display text-2xl font-black text-neo-black',
                      rank === 1 ? 'bg-neo-yellow' : rank <= 3 ? 'bg-neo-lime' : 'bg-neo-cream'
                    )}
                  >
                    {rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-neo-display text-3xl font-black">{row.username}</span>
                  <span className="relative flex shrink-0 items-baseline gap-2">
                    <AdaptiveMotion.span
                      key={pop?.id ?? 'still'}
                      initial={pop ? { scale: 1.35 } : false}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                      className="font-neo-display text-4xl font-black tabular-nums text-neo-lime"
                    >
                      {row.score}
                    </AdaptiveMotion.span>
                    <span className="text-sm font-bold uppercase opacity-80">{pointsLabel}</span>
                  </span>
                  {pop && <ScorePop pop={pop} />}
                </div>
              </BoundedConfettiBurst>
            </div>
          );
        }}
      />
    </div>
  );
}

const LiveClassroomLeaderboard = memo<LiveClassroomLeaderboardProps>(
  ({ leaderboard, currentPlayer, variant = 'phone', topN = 8, gameMode, className }) => {
    const { t, dir } = useLanguage();
    const { playModeSound } = useModeSting();
    const lastStingRef = useRef(0);

    const sorted = useMemo(
      () => leaderboard.filter((e) => !e.isHost).sort((a, b) => b.score - a.score),
      [leaderboard]
    );

    const pops = useScorePops(sorted, (ups) => {
      if (!gameMode) return;
      if (variant === 'phone') {
        if (currentPlayer && ups[currentPlayer]) playModeSound(gameMode as ClassroomGameMode, 'start');
        return;
      }
      const now = Date.now();
      if (now - lastStingRef.current < STING_WINDOW_MS) return;
      lastStingRef.current = now;
      playModeSound(gameMode as ClassroomGameMode, 'start');
    });

    const pointsLabel = t('education.student.feel.points');
    const textDir = dir === 'rtl' ? 'rtl' : 'ltr';

    if (variant === 'phone') {
      if (!currentPlayer) return null;
      return (
        <PhoneStrip rows={sorted} me={currentPlayer} pops={pops} pointsLabel={pointsLabel} dir={textDir} className={className} />
      );
    }
    if (sorted.length === 0) return null;
    return (
      <ProjectorBoard rows={sorted.slice(0, topN)} pops={pops} pointsLabel={pointsLabel} dir={textDir} className={className} />
    );
  }
);

LiveClassroomLeaderboard.displayName = 'LiveClassroomLeaderboard';

export default LiveClassroomLeaderboard;
