'use client';

import { useEffect, useState } from 'react';
import { COACH_VERSION, markCoachSeen } from '@/lib/tutorial/modeCoachStore';
import { isAcceptedWord } from '@/lib/wordTowerV2/wheel';
import type { Phase } from '../useTowerRun';

export const GUIDE_STORAGE_KEY = 'wt2_guided_first_word_v1';
const DONE_MS = 2200;

export type GuideStatus = 'pending' | 'spell' | 'drop' | 'done' | 'off';

export interface GuideArgs {
  daily: boolean;
  dict: Set<string> | null;
  dictReady: boolean;
  dictError: boolean;
  wheel: string[];
  selected: number[];
  phase: Phase;
  /** Floors standing, restored ones included: a standing tower means a returning player. */
  towerFloors: number;
  /** Floors this run has landed. */
  floors: number;
}

export interface Guide {
  status: GuideStatus;
  path: number[] | null;
  word: string;
  /** The wheel slot to take next, or null once the player strays from the path. */
  next: number | null;
}

/** Wheel slots spelling the shortest real word, tried in a fixed order so every player gets the same one. */
export function findGuidePath(wheel: string[], dict: Set<string> | null): number[] | null {
  const n = wheel.length;
  for (const len of [3, 4]) {
    const pick: number[] = [];
    const walk = (): number[] | null => {
      if (pick.length === len) {
        return isAcceptedWord(pick.map((i) => wheel[i]).join(''), wheel, dict) ? [...pick] : null;
      }
      for (let i = 0; i < n; i++) {
        if (pick.includes(i)) continue;
        pick.push(i);
        const hit = walk();
        pick.pop();
        if (hit) return hit;
      }
      return null;
    };
    const hit = walk();
    if (hit) return hit;
  }
  return null;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The first daily word, taught by doing: the guide lights the letters of a real
 * word in order, then the drop, then cheers the first floor and steps aside.
 * Shown once, and marked seen the moment it shows.
 */
export function useGuidedFirstWord(a: GuideArgs): Guide {
  const [status, setStatus] = useState<GuideStatus>(a.daily ? 'pending' : 'off');
  const [path, setPath] = useState<number[] | null>(null);
  const [word, setWord] = useState('');

  useEffect(() => {
    if (status !== 'pending') return;
    if (!a.daily || a.dictError) {
      setStatus('off');
      return;
    }
    if (!a.dictReady || !a.dict || a.wheel.length === 0 || a.phase !== 'composing') return;
    const store = storage();
    if (a.towerFloors > 0 || !store || store.getItem(GUIDE_STORAGE_KEY)) {
      setStatus('off');
      return;
    }
    const found = findGuidePath(a.wheel, a.dict);
    if (!found) {
      setStatus('off');
      return;
    }
    try {
      store.setItem(GUIDE_STORAGE_KEY, '1');
    } catch {
      /* quota / private mode: the guide simply shows again next time */
    }
    markCoachSeen('wordTower', COACH_VERSION, store);
    setPath(found);
    setWord(found.map((i) => a.wheel[i]).join('').toUpperCase());
    setStatus('spell');
  }, [status, a.daily, a.dictError, a.dictReady, a.dict, a.wheel, a.phase, a.towerFloors]);

  useEffect(() => {
    if (status === 'pending' || status === 'off') return;
    if (a.phase === 'over') setStatus('off');
    else if (a.floors > 0 && status !== 'done') setStatus('done');
    else if (status === 'spell' && a.phase === 'swinging') setStatus('drop');
    // Taken back off the hook: the letters come back selected, so it is spelling again.
    else if (status === 'drop' && a.phase === 'composing' && a.selected.length > 0) setStatus('spell');
  }, [status, a.phase, a.floors, a.selected.length]);

  useEffect(() => {
    if (status !== 'done') return;
    const id = window.setTimeout(() => setStatus('off'), DONE_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  let next: number | null = null;
  if (status === 'spell' && path) {
    const onPath = a.selected.every((s, i) => path[i] === s);
    next = onPath && a.selected.length < path.length ? path[a.selected.length] : null;
  }
  return { status, path, word, next };
}
