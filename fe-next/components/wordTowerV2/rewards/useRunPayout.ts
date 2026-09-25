'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChestRoll, RunSummary } from '@/lib/wordTowerV2/estate';
import { type TowerWorld, snapshotWorld } from '@/lib/wordTowerV2/engine';
import { MAX_TOWER_BLOCKS, type TowerBlock } from '@/lib/wordTowerV2/estateTower';

/** The facade colours the canvas paints with, so a rival's copy looks the same. */
const FACADE_COLOURS = [0xff6b8b, 0x37e0ff, 0xb58cff, 0xbfff00, 0xff9f43, 0x4fe3b0];

/**
 * The tower the player just built, lowest floor first — this is what a rival
 * sees (and wrecks), so it travels with the run summary.
 */
export function towerBlocksFrom(world: TowerWorld, labels: Map<string, string>): TowerBlock[] {
  return snapshotWorld(world)
    .blocks.filter((b) => world.landed.has(b.id))
    .sort((a, b) => b.y - a.y)
    .slice(0, MAX_TOWER_BLOCKS)
    .map((b, i) => ({
      word: labels.get(b.id) ?? '',
      w: Math.round(b.widthPx),
      x: Math.round(b.x),
      y: Math.round(b.y),
      angle: b.angleRad,
      color: FACADE_COLOURS[i % FACADE_COLOURS.length],
    }))
    .filter((b) => b.word.length > 0);
}

export interface RunPayout {
  coins: number;
  chest: ChestRoll;
  summary: RunSummary;
}

interface Args {
  /** True once the run is finished and the tower has stopped moving. */
  over: boolean;
  /** False while the estate (and therefore auth) is still resolving. */
  ready: boolean;
  /** Built by the caller at the moment the run ends. */
  getSummary: () => RunSummary;
  reportRun: (summary: RunSummary, opts?: { keepalive?: boolean }) => Promise<{ coins: number; chest: ChestRoll } | null>;
}

/**
 * Banks the run with the server EXACTLY once and hands back what it paid.
 *
 * Once per run, not once per render: `POST /estate/run` is rate limited and
 * credits coins, so a StrictMode double-effect or a re-render would either 429
 * or pay twice. `null` (guest offline, a failed POST, estate still loading)
 * means no reveal — the results screen shows instead of an empty chest.
 */
export interface PayoutStatus {
  status: 'idle' | 'pending' | 'paid' | 'none';
  coins: number;
}

export function useRunPayout({ over, ready, getSummary, reportRun }: Args): {
  payout: RunPayout | null;
  waiting: boolean;
  payoutStatus: PayoutStatus;
  clear: () => void;
  bank: (keepalive?: boolean) => Promise<void>;
} {
  const [payout, setPayout] = useState<RunPayout | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>({ status: 'idle', coins: 0 });
  const sentRef = useRef(false);
  // Held in refs so a re-render can never re-run (and cancel) the report.
  const summaryRef = useRef(getSummary);
  summaryRef.current = getSummary;
  const reportRef = useRef(reportRun);
  reportRef.current = reportRun;
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const wasOverRef = useRef(over);
  useEffect(() => {
    if (!over) {
      // A NEW run (over -> live): arm the report again. Only on that edge — a
      // `ready` flicker re-runs this effect too, and re-arming then would pay
      // a run that was already banked on the way out a second time.
      if (wasOverRef.current) {
        sentRef.current = false;
        setPayout(null);
        setWaiting(false);
        setPayoutStatus({ status: 'idle', coins: 0 });
      }
      wasOverRef.current = false;
      return;
    }
    wasOverRef.current = true;
    if (!ready || sentRef.current) return;
    sentRef.current = true;
    setWaiting(true);
    setPayoutStatus({ status: 'pending', coins: 0 });
    const summary = summaryRef.current();
    // Deliberately NOT cancelled on cleanup: StrictMode tears the first effect
    // down and the guard then blocks the retry, so a cancel would lose the only
    // report of the run.
    void reportRef.current(summary)
      .then((res) => {
        if (res) {
          setPayout({ coins: res.coins, chest: res.chest, summary });
          setPayoutStatus({ status: 'paid', coins: res.coins });
        } else {
          setPayout(null);
          setPayoutStatus({ status: 'none', coins: 0 });
        }
      })
      .catch(() => {
        setPayout(null);
        setPayoutStatus({ status: 'none', coins: 0 });
      })
      .finally(() => setWaiting(false));
  }, [over, ready]);

  /**
   * The player is LEAVING a run that is still standing (exit button, tab
   * closed, route change). Until this, only a collapse banked anything: coins,
   * floors, the best height and the rival copy of the tower were all lost the
   * moment you walked away. Same once-per-run guard as the collapse, so the
   * run is never credited twice. `keepalive` lets the POST outlive the page.
   */
  const bank = useCallback(async (keepalive = false) => {
    if (sentRef.current || !readyRef.current) return;
    const summary = summaryRef.current();
    if (summary.floors <= 0) return;
    sentRef.current = true;
    await reportRef.current(summary, { keepalive }).catch(() => null);
  }, []);

  const clear = useCallback(() => setPayout(null), []);
  return { payout, waiting, payoutStatus, clear, bank };
}
