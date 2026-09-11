'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  applyLeaderboard,
  buildRoster,
  createActivityState,
  summarizeClass,
  type ClassSummary,
  type RosterMember,
  type RosterRow,
} from './classActivityModel';

/** How often the idle verdict is re-evaluated (the grace window is minutes-scale). */
const TICK_MS = 5_000;

interface UseClassActivityResult {
  rows: RosterRow[];
  summary: ClassSummary;
  /** False until a leaderboard payload has landed — nobody is called idle yet. */
  hasActivityData: boolean;
}

/**
 * Live "who is playing, who is stuck" read-out for the teacher's control strip.
 *
 * Membership comes from the caller (`updateUsers`, which only fires on
 * join/leave); the per-word activity feed is `updateLeaderboard`, which the
 * server broadcasts to the whole room on every accepted word. Keeping the two
 * apart is deliberate — see `classActivityModel`.
 */
export function useClassActivity(
  socket: Socket | null | undefined,
  members: RosterMember[],
  hostUsername?: string,
): UseClassActivityResult {
  const [state, setState] = useState(() => createActivityState(Date.now()));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!socket) return;
    const onLeaderboard = (payload: { leaderboard?: RosterMemberScore[] } | undefined) => {
      const entries = payload?.leaderboard ?? [];
      const stamp = Date.now();
      setState((prev) => applyLeaderboard(prev, entries, stamp));
      setNow(stamp);
    };
    socket.on('updateLeaderboard', onLeaderboard);
    return () => {
      socket.off('updateLeaderboard', onLeaderboard);
    };
  }, [socket]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(
    () => buildRoster(members, state, now, hostUsername),
    [members, state, now, hostUsername],
  );
  const summary = useMemo(() => summarizeClass(rows), [rows]);

  return { rows, summary, hasActivityData: state.hasData };
}

interface RosterMemberScore {
  username: string;
  score?: number;
  wordsFound?: number;
}

export default useClassActivity;
