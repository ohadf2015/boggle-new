/**
 * What the solo results screen offers a new player.
 *
 * dailyDoneEver choice:
 * `lib/connections/dailyClient.ts` only *reads* "played today"
 * (`connections-daily-played` === today's UTC date). The key itself is written
 * on completion and never deleted, so a non-empty value — including a past
 * date — means that daily was completed at least once. We mirror that key
 * (the helper is today-only, so it is the wrong read). Word Hunt is not in
 * that module. `lexiclash:dailyDoneEver:v1` is a never-expiring flag a daily
 * completion can set via `markDailyDoneEver`. Solo results only read both.
 * The selector below is pure; the storage helpers are the I/O edge.
 */

export const CONNECTIONS_PLAYED_KEY = 'connections-daily-played';
export const DAILY_DONE_EVER_KEY = 'lexiclash:dailyDoneEver:v1';

const REMATCH_CYCLE = ['quick', 'standard', 'intense'] as const;

export type SoloPromote = 'daily' | 'multiplayer' | null;

export interface SoloRotation {
  /** Empty string → caller keeps the current rematch setup. */
  rematchPresetId: string;
  promote: SoloPromote;
}

export function buildSoloRotation(input: {
  gamesPlayed: number;
  dailyDoneEver: boolean;
}): SoloRotation {
  const { gamesPlayed, dailyDoneEver } = input;
  if (!(gamesPlayed < 4) || dailyDoneEver) {
    return { rematchPresetId: '', promote: null };
  }
  return {
    rematchPresetId: REMATCH_CYCLE[gamesPlayed % 3],
    promote: gamesPlayed % 2 === 0 ? 'daily' : 'multiplayer',
  };
}

export function getDailyDoneEver(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(DAILY_DONE_EVER_KEY) === '1') return true;
    const played = window.localStorage.getItem(CONNECTIONS_PLAYED_KEY);
    return typeof played === 'string' && played.length > 0;
  } catch {
    return false;
  }
}

export function markDailyDoneEver(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DAILY_DONE_EVER_KEY, '1');
  } catch {
    /* quota / private mode — non-fatal */
  }
}
