'use client';

import { ChevronsUp, Trophy } from 'lucide-react';
import type { RankGain } from '@/lib/wordTower/rivalCohort';

interface Props {
  /** The viewer's live board position (1 = top). */
  rank: number;
  /** Set for a few seconds right after an overtake; null otherwise. */
  rankGain: RankGain | null;
  /** Hidden entirely when the board has nobody on it. */
  hasRivals: boolean;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * The stake behind the climb: your live board position, and the jump you just
 * made when you overtake someone.
 *
 * Passing a rival used to produce a name in a toast and nothing else. A name is
 * a fact; a rank is a possession — it can be lost, so gaining it reads as
 * winning something. This pins the number permanently and flashes the delta
 * ("#12 → #11") on the frame the climb earns it.
 */
export function WordTowerRankStakes({ rank, rankGain, hasRivals, reducedMotion, t, dir }: Props) {
  if (!hasRivals) return null;
  const isLeader = rank === 1;

  return (
    /* No absolute position of its own: this stacks inside the end-side rival
       column that WordTowerPlay owns, so it cannot drift into the chase chip
       the way two independently hand-tuned offsets on the same edge always
       eventually do. */
    <div className="flex flex-col items-end gap-1" dir={dir} role="status" aria-live="polite">
      <div
        className={`flex items-center gap-1 rounded-neo border-neo-thick border-black px-2 py-1 shadow-hard ${
          isLeader ? 'bg-neo-yellow' : 'bg-neo-navy/85 backdrop-blur-sm'
        }`}
        aria-label={t('wordTower.rank.aria', { rank })}
      >
        {/* The crown only appears at #1 — an icon everyone always has is
            decoration, not information. */}
        {isLeader
          ? <Trophy className="h-3.5 w-3.5 text-black" aria-hidden />
          : <ChevronsUp className="h-3.5 w-3.5 text-neo-cyan" aria-hidden />}
        <span
          className={`font-neo-display text-sm font-black tabular-nums ${isLeader ? 'text-black' : 'text-neo-white'}`}
          aria-hidden
        >
          {t('wordTower.rank.badge', { rank })}
        </span>
      </div>

      {rankGain && (
        <div
          className={`flex items-center gap-1 rounded-neo border-neo border-black bg-neo-lime px-2 py-0.5 shadow-hard ${
            reducedMotion ? '' : 'animate-neo-pop'
          }`}
          aria-label={t('wordTower.rank.gainAria', { from: rankGain.from, to: rankGain.to })}
        >
          <span className="font-neo-body text-[11px] font-bold text-black/60 line-through tabular-nums" aria-hidden>
            {t('wordTower.rank.badge', { rank: rankGain.from })}
          </span>
          <span className="font-neo-display text-xs font-black text-black tabular-nums" aria-hidden>
            {t('wordTower.rank.badge', { rank: rankGain.to })}
          </span>
        </div>
      )}
    </div>
  );
}
