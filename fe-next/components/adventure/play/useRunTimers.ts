'use client';

import { useEffect, useState, type MutableRefObject } from 'react';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';
import type { CombatEvent } from '@/lib/adventure/play/combat';
import { tickClock } from '@/lib/adventure/play/runClock';
import { FOE_KO_FINISH_MS, type RunPhase } from './runTypes';

/** The combo shown on the board lapses when its chain window runs out, like the classic game's. */
export function useLiveCombo(scored: { combo: number[] }): number {
  const [liveCombo, setLiveCombo] = useState(0);
  useEffect(() => {
    const level = scored.combo[scored.combo.length - 1] ?? 0;
    setLiveCombo(level);
    if (!level) return;
    const id = setTimeout(() => setLiveCombo(0), calculateComboChainWindow(level));
    return () => clearTimeout(id);
  }, [scored]);
  return liveCombo;
}

interface ClockOptions {
  phase: RunPhase;
  endAtRef: MutableRefObject<number>;
  lastTickRef: MutableRefObject<number>;
  combatRef: MutableRefObject<unknown>;
  setMsLeft: (update: (prev: number) => number) => void;
  dispatchCombat: (ev: CombatEvent) => void;
  finish: () => Promise<void>;
}

/**
 * Clock + combat tick. A backgrounded tab does not drain the level (or let the
 * enemy keep swinging) — `tickClock` slides the deadline instead.
 */
export function useRunClock({ phase, endAtRef, lastTickRef, combatRef, setMsLeft, dispatchCombat, finish }: ClockOptions) {
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const now = Date.now();
      // The commit is throttled to the displayed second: at 5Hz this re-rendered
      // the whole level screen — and every callback it hands the grid — right through the player's drag.
      const paused = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const t = tickClock({ now, endAt: endAtRef.current, lastTick: lastTickRef.current, paused });
      endAtRef.current = t.endAt;
      setMsLeft((prev) => (Math.ceil(prev / 1000) === Math.ceil(t.msLeft / 1000) ? prev : t.msLeft));
      if (combatRef.current && t.dt > 0) dispatchCombat({ type: 'tick', dt: t.dt });
      lastTickRef.current = now;
      if (t.expired) void finish();
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish, dispatchCombat, endAtRef, lastTickRef, combatRef, setMsLeft]);
}

interface EndingOptions {
  phase: RunPhase;
  dead: boolean;
  combatLevel: boolean;
  enemyDown: boolean;
  foeKo: boolean;
  allTargetsFound: boolean;
  finish: (opts?: { died?: boolean }) => Promise<void>;
}

/** Death ends the run; the enemy falling, a K.O. or the last hunt target ends the level. */
export function useRunEndings({ phase, dead, combatLevel, enemyDown, foeKo, allTargetsFound, finish }: EndingOptions) {
  useEffect(() => {
    if (phase === 'playing' && dead) void finish({ died: true });
  }, [phase, dead, finish]);
  useEffect(() => {
    if (phase === 'playing' && combatLevel && enemyDown) void finish();
  }, [phase, combatLevel, enemyDown, finish]);
  // K.O. = nothing left to win, so end after the stamp instead of leaving a dead clock.
  useEffect(() => {
    if (phase !== 'playing' || !foeKo) return;
    const id = setTimeout(() => { void finish(); }, FOE_KO_FINISH_MS);
    return () => clearTimeout(id);
  }, [phase, foeKo, finish]);
  useEffect(() => {
    if (phase === 'playing' && allTargetsFound) void finish();
  }, [phase, allTargetsFound, finish]);
}
