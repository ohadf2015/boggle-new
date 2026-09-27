/**
 * One read of "how is this homework going" — shared by the teacher card and the
 * student's own header.
 *
 * Both sides want the same row: the class streak, how many finished, the class
 * average. They used to want it from two places (the teacher card fetched, the
 * student read localStorage), which meant a student on a fresh phone saw a
 * 0-day streak while their class was five days in. Two routes to one number is
 * pitfalls Class 3; this is the one route.
 *
 * The API decides what comes back: an anonymous caller gets counts and the
 * streak, a signed-in caller also gets the named roster. Nothing here has to
 * know which — it renders what it is given.
 */
'use client';

import { useEffect, useState } from 'react';

export interface MissGapProgressRun {
  name: string;
  stars: number;
  accuracy: number;
  wordsCorrect: number;
  wordsTotal: number;
  durationMs: number;
  onTime: boolean;
}

export interface MissGapProgressData {
  players: number;
  averageAccuracy: number;
  runs: MissGapProgressRun[];
  streak: { currentStreak: number; longestStreak: number };
}

export interface MissGapProgressState {
  data: MissGapProgressData | null;
  /** True once a fetch has failed; the caller falls back to its device copy. */
  failed: boolean;
}

export function buildMissGapProgressUrl(classKey: string, dueDate: string): string {
  const params = new URLSearchParams({ classKey });
  // Only send `dueDate` when there is one. An empty `dueDate=` would ask the
  // server to narrow to the empty due key and return nothing — see the route.
  if (dueDate) params.set('dueDate', dueDate);
  return `/api/education/miss-gap/progress?${params.toString()}`;
}

export function useMissGapProgress(
  classKey: string,
  dueDate: string,
  refreshToken: number = 0,
): MissGapProgressState {
  const [data, setData] = useState<MissGapProgressData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!classKey) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildMissGapProgressUrl(classKey, dueDate));
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as MissGapProgressData;
        if (cancelled) return;
        setData({
          players: body.players ?? 0,
          averageAccuracy: body.averageAccuracy ?? 0,
          runs: Array.isArray(body.runs) ? body.runs : [],
          streak: {
            currentStreak: body.streak?.currentStreak ?? 0,
            longestStreak: body.streak?.longestStreak ?? 0,
          },
        });
        setFailed(false);
      } catch {
        // Never silent (pitfalls Class 4): the caller shows a "couldn't load"
        // line rather than an authoritative-looking zero.
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classKey, dueDate, refreshToken]);

  return { data, failed };
}
