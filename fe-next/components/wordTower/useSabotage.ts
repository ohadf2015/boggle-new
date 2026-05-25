'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import type { HazardKind } from '@/lib/wordTower/hazards';
import {
  SABOTAGE_PERFECT_THRESHOLD,
  awardSabotageToken,
  canSabotage,
  sabotageFloorsFor,
  spendSabotageToken,
} from '@/lib/wordTower/sabotage';

interface SentHit {
  /** Stable hit id — drives the wrecking-ball animation lifecycle. */
  id: string;
  /** Display name of the rival hit (for the toast). */
  targetName: string;
  /** Stable rival id (for cross-referencing the rail marker). */
  targetId: string;
}

/**
 * useSabotage — owns the wrecking-ball mechanic for the climber.
 *
 * - Tokens earn from perfect-drop streaks (capped). Caller passes the LIVE
 *   `perfectStreak` from useCraneDrop; awarding is idempotent across renders.
 * - `openPicker` / `closePicker` toggle the rival picker overlay.
 * - `sabotage` records a hit (drives the rail's local ghost-tower drop + the
 *   animation/toast). Backend POST is deferred to a follow-up; the local
 *   experience is fully demoable today.
 *
 * Pure-ish: side effects limited to a one-shot localStorage breadcrumb so
 * the founder can confirm spend counts during playtests.
 */
export function useSabotage(perfectStreak: number) {
  const [tokens, setTokens] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lastHit, setLastHit] = useState<SentHit | null>(null);
  /** rivalId → floors-dropped, used to render the local ghost tower shrunk. */
  const [hitsByRival, setHitsByRival] = useState<Record<string, number>>({});
  const [earnedToast, setEarnedToast] = useState<number | null>(null);
  const lastEarnedRef = useRef(0);

  // Token earn driven by the perfect-streak; idempotent.
  useEffect(() => {
    const next = awardSabotageToken(tokens, perfectStreak);
    if (next > tokens) {
      setTokens(next);
      // Surface the earn toast ONLY on a real new earn (skip the cap-noop).
      if (perfectStreak > lastEarnedRef.current) {
        lastEarnedRef.current = perfectStreak;
        setEarnedToast(perfectStreak);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfectStreak]);

  const dismissEarned = useCallback(() => setEarnedToast(null), []);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const dismissHit = useCallback(() => setLastHit(null), []);

  /** Send the wrecking ball — spends a token, drops the rail marker locally. */
  const sabotage = useCallback((targetId: string, targetName: string) => {
    if (tokens <= 0) return;
    setTokens((t) => spendSabotageToken(t));
    const hitId = `sab-${Date.now()}`;
    setLastHit({ id: hitId, targetId, targetName });
    setHitsByRival((m) => ({ ...m, [targetId]: (m[targetId] ?? 0) + sabotageFloorsFor() }));
    setPickerOpen(false);
    // Best-effort breadcrumb (server wire-up deferred — see memory).
    try {
      const raw = localStorage.getItem('wt-sabotage-log') ?? '[]';
      const log = JSON.parse(raw) as Array<{ at: number; targetId: string; targetName: string }>;
      log.push({ at: Date.now(), targetId, targetName });
      localStorage.setItem('wt-sabotage-log', JSON.stringify(log.slice(-50)));
    } catch {
      /* non-fatal */
    }
  }, [tokens]);

  return {
    tokens,
    pickerOpen,
    openPicker,
    closePicker,
    sabotage,
    lastHit,
    dismissHit,
    hitsByRival,
    earnedToast,
    dismissEarned,
    canSabotageNow: (rivalCount: number) => canSabotage(tokens, rivalCount),
    /** Public for tests: how many perfects until the next token. */
    perfectsPerToken: SABOTAGE_PERFECT_THRESHOLD,
  };
}

/** Approx metres lost per sabotaged floor on the rival rail (decorative only). */
const SABOTAGE_M_PER_FLOOR = 8;

/**
 * useSabotageIntegration — wraps useSabotage with rival-rail display math +
 * the receiver-side simulator (URL-flag) so WordTowerPlay can stay slim.
 *
 * @param perfectStreak  current perfect-drop streak from useCraneDrop
 * @param rivals         leaderboard markers (untouched)
 * @param fireHazard     tower.hazard fn — used by the receiver-side simulator
 */
export function useSabotageIntegration(
  perfectStreak: number,
  rivals: ReadonlyArray<RivalMarker>,
  fireHazard: (floors: number, kind: HazardKind, ids: string[]) => void,
) {
  const sab = useSabotage(perfectStreak);

  const displayRivals = useMemo(
    () => rivals.map((r) => ({
      ...r,
      heightM: Math.max(0, r.heightM - (sab.hitsByRival[r.id] ?? 0) * SABOTAGE_M_PER_FLOOR),
    })),
    [rivals, sab.hitsByRival],
  );

  const simFired = useRef(false);
  useEffect(() => {
    if (simFired.current || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('sim_sabotage') !== '1') return;
    simFired.current = true;
    const id = setTimeout(() => fireHazard(1, 'sabotage', [`sim-sabotage-${Date.now()}`]), 1200);
    return () => clearTimeout(id);
  }, [fireHazard]);

  return { sab, displayRivals };
}

