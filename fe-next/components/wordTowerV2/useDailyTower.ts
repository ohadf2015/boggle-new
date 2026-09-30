'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { postWithAuth } from '@/utils/authFetch';
import { getGuestFingerprint } from '@/utils/guestManager';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import { recordV2DailyClimb } from '@/lib/wordTowerV2/daily';
import {
  type DailyTowerSave,
  commitTower,
  dailyTargetM,
  emptySave,
  growthToday,
  loadDailyTower,
  revertToDayStart,
  rollDay,
  saveDailyTower,
} from '@/lib/wordTowerV2/dailyTower';
import { standingTower } from './runHelpers';
import type { TowerWorld } from '@/lib/wordTowerV2/engine';

const TICK_MS = 1500;

interface Args {
  daily: boolean;
  language: string;
  phase: string;
  worldRef: { current: TowerWorld };
  labelsRef: { current: Map<string, string> };
  hangingIdRef: { current: string | null };
  restoreTower: (words: string[]) => number;
}

export interface DailyTowerApi {
  /** Floors that stood when the page opened (the run's own floors are extra). */
  restoredFloors: number;
  /** Metres grown today — the day's score. */
  growthM: number;
  /** Today's goal in metres. */
  targetM: number;
  targetHit: boolean;
  /** Height of the whole tower in metres (carried floors included). */
  totalM: number;
  /** Save + submit now (exit, tab hide). Safe to call any time. */
  flush: (opts?: { keepalive?: boolean }) => void;
  /** After a collapse: roll back to the start-of-day tower and rebuild it. */
  resume: () => number;
}

/**
 * The persistent daily tower: restore what you left, save as you build, score
 * only today's growth. Everything pure lives in `lib/wordTowerV2/dailyTower`.
 */
export function useDailyTower({ daily, language, phase, worldRef, labelsRef, hangingIdRef, restoreTower }: Args): DailyTowerApi {
  const saveRef = useRef<DailyTowerSave>(emptySave(language));
  const lastKeyRef = useRef('');
  const submittedRef = useRef(0);
  const [restoredFloors, setRestoredFloors] = useState(0);
  const [growthM, setGrowthM] = useState(0);
  const [targetM, setTargetM] = useState(0);
  const [totalM, setTotalM] = useState(0);
  const revertedRef = useRef(false);

  const persist = useCallback((next: DailyTowerSave) => {
    saveRef.current = next;
    try {
      saveDailyTower(next, window.localStorage);
    } catch {
      /* storage blocked */
    }
    setGrowthM(growthToday(next));
    setTotalM(next.totalM);
  }, []);

  // Open: load, roll the day (baseline = the tower as we left it), rebuild it.
  useEffect(() => {
    if (!daily) return;
    let stored = emptySave(language);
    try {
      stored = loadDailyTower(language, window.localStorage);
    } catch {
      /* storage blocked */
    }
    const rolled = rollDay(stored, utcDateKey());
    setTargetM(dailyTargetM(rolled.dayStart.totalM, rolled.dayKey));
    persist(rolled);
    lastKeyRef.current = rolled.words.join('|');
    submittedRef.current = growthToday(rolled);
    setRestoredFloors(restoreTower(rolled.words));
  }, [daily, language, restoreTower, persist]);

  const submitGrowth = useCallback(
    (save: DailyTowerSave, keepalive: boolean) => {
      const growth = growthToday(save);
      if (growth <= 0 || growth <= submittedRef.current) return;
      const words = save.words;
      const body = recordV2DailyClimb(
        {
          climbM: growth,
          floors: Math.max(1, Math.round(growth / 3)),
          longestWord: words.reduce((a, w) => (w.length > a.length ? w : a), ''),
        },
        { language, guestFingerprint: getGuestFingerprint(), storage: window.localStorage },
      );
      submittedRef.current = growth;
      if (body) void postWithAuth('/api/word-tower/daily/score', body, keepalive ? { keepalive: true } : {}).catch(() => undefined);
    },
    [language],
  );

  const snapshot = useCallback(
    (keepalive: boolean) => {
      if (!daily || phase === 'over') return;
      const tower = standingTower(worldRef.current, labelsRef.current, hangingIdRef.current);
      if (tower.words.length === 0) return;
      const key = tower.words.join('|');
      if (key === lastKeyRef.current && !keepalive) return;
      lastKeyRef.current = key;
      const next = commitTower(saveRef.current, tower);
      persist(next);
      submitGrowth(next, keepalive);
    },
    [daily, phase, worldRef, labelsRef, hangingIdRef, persist, submitGrowth],
  );

  useEffect(() => {
    if (!daily) return;
    const id = window.setInterval(() => snapshot(false), TICK_MS);
    return () => window.clearInterval(id);
  }, [daily, snapshot]);

  // A collapse costs today's growth, never the skyline: back to the checkpoint.
  useEffect(() => {
    if (!daily) return;
    if (phase === 'over' && !revertedRef.current) {
      revertedRef.current = true;
      persist(revertToDayStart(saveRef.current));
      lastKeyRef.current = saveRef.current.words.join('|');
    }
    if (phase !== 'over') revertedRef.current = false;
  }, [daily, phase, persist]);

  const flush = useCallback(
    (opts?: { keepalive?: boolean }) => snapshot(opts?.keepalive ?? false),
    [snapshot],
  );

  const resume = useCallback(() => {
    const n = restoreTower(saveRef.current.words);
    setRestoredFloors(n);
    return n;
  }, [restoreTower]);

  return {
    restoredFloors,
    growthM,
    targetM,
    targetHit: targetM > 0 && growthM >= targetM,
    totalM,
    flush,
    resume,
  };
}
