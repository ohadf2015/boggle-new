'use client';

import { useEffect, useState } from 'react';
import type { Phase } from '../useTowerRun';
import { findGuidePath } from './useGuidedFirstWord';

/** How long a brand-new player can sit on an empty first floor before a word lights up. */
export const FIRST_FLOOR_HINT_MS = 8000;

interface Args {
  dict: Set<string> | null;
  dictReady: boolean;
  wheel: string[];
  selectedCount: number;
  phase: Phase;
  /** Floors this run has landed. */
  floors: number;
  /** Floors standing, restored ones included. */
  towerFloors: number;
  /** The scripted first-word guide is already showing the way. */
  guideActive: boolean;
}

/**
 * The first floor is the one players never get past: it can't be missed (it
 * lands on the street), but finding a first word can stall someone new. If
 * nothing is spelled for a few seconds on an empty tower, light up a real word.
 * Gone with the first floor; a shuffle or any letter restarts the wait.
 */
export function useFirstFloorHint({ dict, dictReady, wheel, selectedCount, phase, floors, towerFloors, guideActive }: Args): number[] | null {
  const [hint, setHint] = useState<number[] | null>(null);
  const eligible = dictReady && phase === 'composing' && floors === 0 && towerFloors === 0 && !guideActive;
  const wheelKey = wheel.join('');

  // A new set of letters (shuffle, new run) or the first floor ends the old hint.
  useEffect(() => {
    setHint(null);
  }, [wheelKey, eligible]);

  useEffect(() => {
    if (!eligible || selectedCount > 0 || hint) return;
    const id = setTimeout(() => setHint(findGuidePath(wheel, dict)), FIRST_FLOOR_HINT_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, selectedCount, wheelKey, hint]);

  return eligible ? hint : null;
}
