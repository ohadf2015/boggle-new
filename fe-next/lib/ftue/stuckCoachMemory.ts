/**
 * Once-ever memory for the stuck-player coach, per mode. "Experienced" is known
 * from this device alone (a word found in that mode, or the coach already shown
 * there), because guest game counters skip Blast and the wheels.
 */

export type StuckCoachMode =
  | 'classic'
  | 'wordHunt'
  | 'dailyWordHunt'
  | 'wheelRush'
  | 'dailyWheel'
  | 'blast'
  | 'singlePlayer'
  | 'adventure';

export type StuckCoachMark = 'shown' | 'found';

export interface StuckCoachStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const stuckCoachKey = (mode: StuckCoachMode) => `lc_stuck_coach_v1_${mode}`;

const LEGACY_FLAGS: Partial<Record<StuckCoachMode, (s: StuckCoachStorage) => boolean>> = {
  classic: (s) => {
    try {
      return JSON.parse(s.getItem('lexiclash_contextual_guidance') ?? '{}')?.stuckCoachShown === true;
    } catch {
      return false;
    }
  },
  wordHunt: (s) => s.getItem('mp_ftue_drag_v1') === 'dismissed',
  wheelRush: (s) => s.getItem('mp_ftue_drag_v1') === 'dismissed',
  dailyWheel: (s) => s.getItem('ww_ftue_drag_v1') === 'dismissed',
};

function defaultStorage(): StuckCoachStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isModeCoached(
  mode: StuckCoachMode,
  storage: StuckCoachStorage | null = defaultStorage(),
): boolean {
  if (!storage) return true;
  try {
    if (storage.getItem(stuckCoachKey(mode))) return true;
    return LEGACY_FLAGS[mode]?.(storage) ?? false;
  } catch {
    return true;
  }
}

export function rememberMode(
  mode: StuckCoachMode,
  mark: StuckCoachMark,
  storage: StuckCoachStorage | null = defaultStorage(),
): void {
  try {
    if (!storage || storage.getItem(stuckCoachKey(mode)) === 'found') return;
    storage.setItem(stuckCoachKey(mode), mark);
  } catch {
    /* blocked storage reads as "coached" anyway */
  }
}
