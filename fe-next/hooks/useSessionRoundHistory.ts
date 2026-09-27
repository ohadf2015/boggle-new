/**
 * useSessionRoundHistory — "+40 vs last round", and the round counter that
 * makes Rematch feel like a session rather than a button.
 *
 * Storage is `sessionStorage`, deliberately: a classroom session IS a tab. Shut
 * the laptop at the end of the period and the streak is gone, which is the
 * honest behaviour — nobody wants Tuesday's third round compared to Monday's.
 *
 * THE TWO BUGS THIS HOOK EXISTS TO NOT HAVE:
 *  1. Reading the delta from a list this round is already in ⇒ "+0 vs last
 *     round" on every screen. The previous rounds are snapshotted into a ref
 *     on the render that records, and every number is read from that snapshot.
 *  2. Recording the round again on each re-render ⇒ the session fills with
 *     duplicates of one round and the count is nonsense. A results screen
 *     re-renders freely while the scores payload settles, so the write is
 *     ref-guarded to exactly once per mount.
 *
 * Everything degrades to silence: a private window that throws on
 * `sessionStorage`, a corrupted entry, or a round that is not ready to be
 * counted all produce `momentum: null` and round 1 — no chip is always better
 * than a confident wrong chip.
 */

'use client';

import { useEffect, useRef } from 'react';
import {
  appendRound,
  momentumFor,
  sweepStreak as computeSweepStreak,
  type RoundMomentum,
  type SessionRound,
} from '@/lib/education/roundEndHistory';

export interface UseSessionRoundHistoryArgs {
  /** From `sessionKeyFor(summary)` — one key per teacher + lesson set. */
  sessionKey: string;
  /** This client's score for the round just finished. */
  score: number;
  /** Placing, 1 = won, 0 = not ranked. */
  rank: number;
  /** Humans ranked this round. */
  players: number;
  /** The class found every lesson word. */
  sweep: boolean;
  /**
   * Record the round only once the numbers are real. A results screen that
   * mounts before the standings arrive would otherwise bank a zero.
   */
  ready: boolean;
}

export interface SessionRoundHistory {
  /** 1 for the first round of the session. */
  roundNumber: number;
  /** `null` for round one, and whenever the session cannot be read. */
  momentum: RoundMomentum | null;
  /** Consecutive 100%-coverage rounds, counting the one just played. */
  sweepStreak: number;
}

const EMPTY: SessionRoundHistory = { roundNumber: 1, momentum: null, sweepStreak: 0 };

function readHistory(key: string): SessionRound[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // A hand-edited or half-written entry must not take the results screen
    // down with it: keep only rows that carry the numbers we render.
    return parsed.filter(
      (r): r is SessionRound =>
        !!r && typeof r === 'object' && typeof (r as SessionRound).score === 'number'
    );
  } catch {
    return [];
  }
}

function writeHistory(key: string, history: SessionRound[]): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(history));
  } catch {
    // Private window, quota, disabled storage — the chip disappears, the
    // results screen does not.
  }
}

export function useSessionRoundHistory({
  sessionKey,
  score,
  rank,
  players,
  sweep,
  ready,
}: UseSessionRoundHistoryArgs): SessionRoundHistory {
  // Computed on the ONE render that first sees a ready round, then frozen.
  // Later renders read these refs, so a late-settling scores payload cannot
  // move the delta out from under the chip the room is already reading.
  const resultRef = useRef<SessionRoundHistory | null>(null);
  const pendingRef = useRef<{ key: string; history: SessionRound[] } | null>(null);
  const writtenRef = useRef(false);

  if (ready && typeof window !== 'undefined' && resultRef.current === null) {
    const before = readHistory(sessionKey);
    // `at: 0` here on purpose — a clock read during render is impure, and the
    // ordering this module actually uses is the array's, not the timestamp's.
    // The effect below stamps the real time before anything is written.
    const round: SessionRound = { score, rank, players, sweep, at: 0 };
    const after = appendRound(before, round);
    resultRef.current = {
      roundNumber: before.length + 1,
      momentum: momentumFor(before, round),
      sweepStreak: computeSweepStreak(after),
    };
    pendingRef.current = { key: sessionKey, history: after };
  }

  // The write is an effect, not a render side-effect, and is guarded so a
  // re-render (or a development double-invoke) cannot bank the same round
  // twice — a duplicated round would make the NEXT round's delta read zero.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || writtenRef.current) return;
    writtenRef.current = true;
    const stamped = pending.history.map((r, i) =>
      i === pending.history.length - 1 ? { ...r, at: Date.now() } : r
    );
    writeHistory(pending.key, stamped);
  });

  return resultRef.current ?? EMPTY;
}

export default useSessionRoundHistory;
