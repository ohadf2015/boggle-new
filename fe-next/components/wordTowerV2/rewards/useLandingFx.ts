'use client';

import { useCallback, useRef, useState } from 'react';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';

/** Where a floor just hit, in TowerCanvas screen px (canvas-local, CSS px). */
export interface LandPoint {
  x: number;
  y: number;
  quality: LandingQuality;
}

export interface Impact extends LandPoint {
  key: number;
  /** Coins this landing paid — the burst carries the payout, not a later toast. */
  amount: number;
  /** A crate paid too: gold treatment. */
  crate: boolean;
  /** The perfect streak this landing was paid at — the chip wears it as x N. */
  combo: number;
}

export interface LandingFx {
  impacts: Impact[];
  /** The rewards hook banks the payout during its effect (React commit). */
  arm: (amount: number, crate: boolean, combo?: number) => void;
  /** TowerCanvas reports the impact point on the next frame; it takes the payout. */
  report: (point: LandPoint) => void;
  clear: (key: number) => void;
}

/** Bursts kept alive at once — a fast stack should never queue a backlog. */
const MAX_LIVE = 3;
/**
 * How long a just-reported burst stays open to a payout that arrives after it.
 * React may flush the commit after the next animation frame, so either order
 * happens; longer than this and the coins belong to the NEXT landing.
 */
const PAIR_MS = 400;

/**
 * Pairs the coins a landing paid with the pixel where it actually hit.
 *
 * The two arrive from different clocks: `useRunRewards` computes the payout in a
 * React effect (the landing poll's commit), while TowerCanvas knows the screen
 * point on its next rAF frame. Neither order is guaranteed — observed live, the
 * frame won and the `+N` silently never rendered — so this pairs them BOTH ways:
 * a payout waiting is claimed by the next point, and a point that arrived first
 * stays open to a payout for `PAIR_MS`. That is what puts the `+N` on the impact
 * frame rather than in a toast after it.
 */
export function useLandingFx(): LandingFx {
  const armed = useRef<{ amount: number; crate: boolean; combo: number } | null>(null);
  const openRef = useRef<{ key: number; at: number } | null>(null);
  const keyRef = useRef(0);
  const [impacts, setImpacts] = useState<Impact[]>([]);

  const arm = useCallback((amount: number, crate: boolean, combo = 0) => {
    const open = openRef.current;
    if (open && Date.now() - open.at <= PAIR_MS) {
      openRef.current = null;
      setImpacts((list) => list.map((i) => (i.key === open.key && i.amount === 0 ? { ...i, amount, crate, combo } : i)));
      return;
    }
    armed.current = { amount, crate, combo };
  }, []);

  const report = useCallback((point: LandPoint) => {
    const pay = armed.current;
    armed.current = null;
    keyRef.current += 1;
    const impact: Impact = {
      key: keyRef.current,
      ...point,
      amount: pay?.amount ?? 0,
      crate: pay?.crate ?? false,
      combo: pay?.combo ?? 0,
    };
    openRef.current = pay ? null : { key: impact.key, at: Date.now() };
    setImpacts((list) => [...list.slice(-(MAX_LIVE - 1)), impact]);
  }, []);

  const clear = useCallback((key: number) => setImpacts((list) => list.filter((i) => i.key !== key)), []);

  return { impacts, arm, report, clear };
}
