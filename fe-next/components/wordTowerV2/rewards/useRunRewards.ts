'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunSummary } from '@/lib/wordTowerV2/estate';
import { coinDelta, milestoneFor } from '@/lib/wordTowerV2/rewards';
import type { RunState } from '@/lib/wordTowerV2/run';

/**
 * The in-run payout the player watches build up: coins per landing, the perfect
 * streak, and milestone bursts.
 *
 * Coins are never a second formula — every increment is a difference of the
 * SERVER's `runCoins` over the same summary (rewards.ts `coinDelta`), so the
 * counter and the end-of-run chest can never drift apart.
 */

export interface CoinFlight {
  key: number;
  amount: number;
  /** A crate paid this one — it gets the gold treatment. */
  crate: boolean;
}

export interface Milestone {
  key: number;
  floors: number;
}

export interface RunRewards {
  /** This run's coins so far (preview of the server's number). */
  coins: number;
  /** Perfect landings so far — `RunState` does not keep them. */
  perfects: number;
  /** What the run would report right now (the caller adds the tower). */
  summary: RunSummary;
  /**
   * The summary read at CALL time. The last landing and the collapse land in
   * one commit, so a summary spread during that render is a floor short — the
   * landing is only recorded in this hook's effect, which runs first.
   */
  getSummary: (heightM?: number) => RunSummary;
  flights: CoinFlight[];
  milestone: Milestone | null;
  clearFlight: (key: number) => void;
  clearMilestone: () => void;
}

interface Options {
  run: RunState;
  heightM: number;
  /** Vault perk, already resolved by the estate (1 = none). */
  coinMult?: number;
  district?: number;
  /** Fired when coins are paid, for the sound and the landing chip. */
  onPayout?: (amount: number, crate: boolean, combo: number) => void;
  onMilestone?: (floors: number) => void;
}

const emptySummary = (): RunSummary => ({ floors: 0, perfects: 0, bestCombo: 0, crates: 0, heightM: 0 });

export function useRunRewards({ run, heightM, coinMult = 1, district = 1, onPayout, onMilestone }: Options): RunRewards {
  const [coins, setCoins] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [flights, setFlights] = useState<CoinFlight[]>([]);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const prevRef = useRef({ floors: 0, combo: 0, crates: 0, perfects: 0, bestCombo: 0 });
  const keyRef = useRef(0);
  const summaryRef = useRef<RunSummary>(emptySummary());
  const heightRef = useRef(heightM);
  heightRef.current = heightM;

  const getSummary = useCallback(
    (m?: number): RunSummary => ({ ...summaryRef.current, heightM: m ?? heightRef.current }),
    [],
  );

  const clearFlight = useCallback((key: number) => setFlights((f) => f.filter((x) => x.key !== key)), []);
  const clearMilestone = useCallback(() => setMilestone(null), []);

  useEffect(() => {
    const prev = prevRef.current;
    // A restart rewinds the run: drop everything rather than pay twice.
    if (run.floors < prev.floors) {
      prevRef.current = { floors: 0, combo: 0, crates: 0, perfects: 0, bestCombo: 0 };
      summaryRef.current = emptySummary();
      setCoins(0);
      setPerfects(0);
      setFlights([]);
      setMilestone(null);
      return;
    }
    if (run.floors === prev.floors && run.crates === prev.crates) return;

    // A perfect landing is exactly the one that grows the streak by one.
    const perfect = run.floors > prev.floors && run.combo === prev.combo + 1;
    const nextPerfects = prev.perfects + (perfect ? 1 : 0);
    const before = summaryRef.current;
    const after: RunSummary = {
      floors: run.floors,
      perfects: nextPerfects,
      bestCombo: run.bestCombo,
      crates: run.crates,
      heightM: heightRef.current,
    };
    const amount = coinDelta(before, after, { coinMult, district });
    const crate = run.crates > prev.crates;
    summaryRef.current = after;
    prevRef.current = { floors: run.floors, combo: run.combo, crates: run.crates, perfects: nextPerfects, bestCombo: run.bestCombo };
    setPerfects(nextPerfects);

    if (amount > 0) {
      keyRef.current += 1;
      const key = keyRef.current;
      setFlights((f) => [...f.slice(-5), { key, amount, crate }]);
      setCoins((c) => c + amount);
      onPayout?.(amount, crate, run.combo);
    }

    const hit = milestoneFor(prev.floors, run.floors);
    if (hit !== null) {
      keyRef.current += 1;
      setMilestone({ key: keyRef.current, floors: hit });
      onMilestone?.(hit);
    }
  }, [run.floors, run.combo, run.crates, run.bestCombo, coinMult, district, onPayout, onMilestone]);

  return {
    coins,
    perfects,
    summary: { ...summaryRef.current, heightM },
    getSummary,
    flights,
    milestone,
    clearFlight,
    clearMilestone,
  };
}
