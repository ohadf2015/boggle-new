'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_SAVED_FLOORS, cleanWords } from '@/lib/wordTowerV2/dailyTower';
import type { TowerWorld } from '@/lib/wordTowerV2/engine';
import { clearRunSnapshot, loadRunSnapshot, saveRunSnapshot } from '@/lib/wordTowerV2/runPersist';
import { standingTower } from './runHelpers';

const TICK_MS = 1500;

interface Args {
  enabled: boolean;
  language: string;
  phase: string;
  /** Floors landed since this page opened. */
  floors: number;
  worldRef: { current: TowerWorld };
  labelsRef: { current: Map<string, string> };
  hangingIdRef: { current: string | null };
  restoreTower: (words: string[]) => number;
  /** A resumed tower's height is not a new record. */
  adoptBest: (m: number) => void;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The free tower survives reloads and cash-outs; only a total collapse clears it. */
export function useFreeTowerSave({ enabled, language, phase, floors, worldRef, labelsRef, hangingIdRef, restoreTower, adoptBest }: Args) {
  const [restoredFloors, setRestoredFloors] = useState(0);
  const wordsRef = useRef<string[]>([]);

  const save = useCallback(() => {
    // Mid-collapse the rubble must not replace the last good tower.
    if (worldRef.current.collapsed) return;
    const tower = standingTower(worldRef.current, labelsRef.current, hangingIdRef.current);
    if (tower.words.length === 0) return;
    const words = tower.words.slice(-MAX_SAVED_FLOORS);
    wordsRef.current = words;
    saveRunSnapshot({ daily: false, date: '', language, words, peakM: tower.standingM, floors: words.length }, storage());
  }, [worldRef, labelsRef, hangingIdRef, language]);

  useEffect(() => {
    if (!enabled) return;
    const saved = loadRunSnapshot(false, storage());
    const words = saved?.language === language ? cleanWords(saved.words) : [];
    if (words.length === 0) return;
    wordsRef.current = words;
    if (Number.isFinite(saved?.peakM)) adoptBest(saved!.peakM);
    setRestoredFloors(restoreTower(words));
  }, [enabled, language, restoreTower, adoptBest]);

  useEffect(() => {
    if (!enabled || phase === 'over') return;
    const id = window.setInterval(save, TICK_MS);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [enabled, phase, save]);

  useEffect(() => {
    if (!enabled || phase !== 'over') return;
    save();
    if (worldRef.current.collapsed && floors > 0) {
      wordsRef.current = [];
      clearRunSnapshot(false, storage());
    }
    // Read once as the run ends: `floors` resets with the next run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, phase, save, worldRef]);

  const resume = useCallback(() => {
    setRestoredFloors(restoreTower(wordsRef.current));
  }, [restoreTower]);

  return { restoredFloors, resume };
}
