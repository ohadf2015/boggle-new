'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

export interface ActiveRunPerk {
  id: 'hotStreak';
  /** Drops remaining before this perk expires. */
  dropsRemaining: number;
  /** Multiplier applied to height gained on the next N drops (e.g. 1.5 = +50%). */
  heightMult: number;
}

/** Heights at which a Hot Streak perk auto-awards (no pick screen — instant). */
const MILESTONES_M = [500, 1000, 1500, 2000];
const STREAK_DROPS = 3;
const STREAK_HEIGHT_MULT = 1.5;

/**
 * Ephemeral per-run streak perks — auto-awarded at height milestones, expire
 * after STREAK_DROPS drops. No coin-economy touch. Cleared on unmount (game-over).
 *
 * Call `onGameUpdate(heightM, floorsCount)` on every game state tick; the hook
 * handles milestone detection and drop-counter decrement internally.
 */
export function useRunStreakPerk() {
  const [perks, setPerks] = useState<ActiveRunPerk[]>([]);
  const prevHeightRef = useRef(0);
  const prevFloorsRef = useRef(0);
  const awardedMs = useRef(new Set<number>());

  const onGameUpdate = useCallback((heightM: number, floorsCount: number) => {
    const prevH = prevHeightRef.current;
    const prevF = prevFloorsRef.current;
    prevHeightRef.current = heightM;
    prevFloorsRef.current = floorsCount;

    const newAwards: ActiveRunPerk[] = [];
    for (const ms of MILESTONES_M) {
      if (prevH < ms && heightM >= ms && !awardedMs.current.has(ms)) {
        awardedMs.current.add(ms);
        newAwards.push({ id: 'hotStreak', dropsRemaining: STREAK_DROPS, heightMult: STREAK_HEIGHT_MULT });
      }
    }

    const dropped = floorsCount > prevF;
    if (!dropped && newAwards.length === 0) return;

    setPerks((p) => {
      const afterDrop = dropped
        ? p.map((pk) => ({ ...pk, dropsRemaining: pk.dropsRemaining - 1 })).filter((pk) => pk.dropsRemaining > 0)
        : p;
      return newAwards.length > 0 ? [...afterDrop, ...newAwards] : afterDrop;
    });
  }, []);

  /** Combined height multiplier from all active streak perks (1 when none active). */
  const totalHeightMult = useMemo(
    () => perks.reduce((acc, p) => acc * p.heightMult, 1),
    [perks],
  );

  return { perks, onGameUpdate, totalHeightMult };
}
