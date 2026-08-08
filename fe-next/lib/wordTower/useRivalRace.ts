'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { rivalCohort, rankAmong, rankDelta, isLiveRival, type RankGain, type RivalCohortOptions } from './rivalCohort';
import type { LeaderboardRivalRow, RivalMarker } from './rivals';

/** How long the "#12 → #11" overtake readout stays up. */
export const RANK_FLASH_MS = 3200;

/** How often "is this rival still climbing?" is re-evaluated. Presence has a
 *  5-minute window, so a 30 s tick resolves it promptly without re-rendering the
 *  rail for no reason. */
export const LIVE_TICK_MS = 30_000;

export interface RivalRace {
  /** The reachable band of rivals, re-centred as the climb passes people. */
  rivals: RivalMarker[];
  /** The viewer's live board position (1 = top). */
  rank: number;
  /** Set for {@link RANK_FLASH_MS} whenever the climb moves the viewer up the
   *  board; null the rest of the time. */
  rankGain: RankGain | null;
}

/**
 * The live race against the leaderboard: which rivals are worth chasing right
 * now, where the viewer sits, and when they just moved up.
 *
 * Rank is derived from the LIVE height rather than the stored personal best, so
 * the number reacts inside a run — a board position you can watch move is the
 * thing that makes an overtake feel like it cost something.
 */
export function useRivalRace(
  rows: ReadonlyArray<LeaderboardRivalRow>,
  viewerHeightM: number,
  opts?: RivalCohortOptions,
): RivalRace {
  // Presence needs a clock, and a clock cannot live in a component's render body
  // (`Date.now()` during render is impure and re-reads unpredictably). Owning the
  // tick here keeps every consumer of `rivals` a pure function of its props.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), LIVE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const raw = useMemo(
    () => rivalCohort(rows, viewerHeightM, opts).map((r) => ({ ...r, live: isLiveRival(r, now) })),
    [rows, viewerHeightM, opts, now],
  );

  // Hold the previous array while the BAND is unchanged. `rivalCohort` returns a
  // fresh array on every height change, and the rail renders one positioned ghost
  // tower per entry — handing it a new identity each accepted word would remount
  // all of them mid-climb. Membership only actually changes when you cross
  // someone, which is exactly when a remount is correct.
  //
  // A live climber's altitude is part of the key: without it, a rival moving
  // between refreshes would keep the cached array and their marker would sit
  // frozen — the exact opposite of the signal it exists to give.
  const stableRef = useRef<RivalMarker[]>(raw);
  const key = raw.map((r) => (r.live ? `${r.id}*${Math.round(r.currentHeightM ?? 0)}` : r.id)).join('|');
  const prevKey = useRef(key);
  if (key !== prevKey.current) {
    prevKey.current = key;
    stableRef.current = raw;
  }
  const rivals = stableRef.current;

  const rank = useMemo(() => rankAmong(viewerHeightM, rows), [rows, viewerHeightM]);

  const [rankGain, setRankGain] = useState<RankGain | null>(null);
  // Seeded from the first observed rank, so mounting mid-climb (or resuming a
  // saved tower) never fires a celebration the player did not just earn.
  const prevRank = useRef(rank);
  useEffect(() => {
    const gain = rankDelta(prevRank.current, rank);
    prevRank.current = rank;
    if (!gain) return;
    setRankGain(gain);
    const id = setTimeout(() => setRankGain(null), RANK_FLASH_MS);
    return () => clearTimeout(id);
  }, [rank]);

  return { rivals, rank, rankGain };
}
