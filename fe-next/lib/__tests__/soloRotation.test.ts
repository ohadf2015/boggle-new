import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONNECTIONS_PLAYED_KEY,
  DAILY_DONE_EVER_KEY,
  buildSoloRotation,
  getDailyDoneEver,
  markDailyDoneEver,
} from '../soloRotation';

describe('buildSoloRotation', () => {
  it('alternates daily / multiplayer and cycles the rematch preset for a new player', () => {
    expect(buildSoloRotation({ gamesPlayed: 0, dailyDoneEver: false })).toEqual({
      rematchPresetId: 'quick', promote: 'daily',
    });
    expect(buildSoloRotation({ gamesPlayed: 1, dailyDoneEver: false })).toEqual({
      rematchPresetId: 'standard', promote: 'multiplayer',
    });
    expect(buildSoloRotation({ gamesPlayed: 2, dailyDoneEver: false })).toEqual({
      rematchPresetId: 'intense', promote: 'daily',
    });
    expect(buildSoloRotation({ gamesPlayed: 3, dailyDoneEver: false })).toEqual({
      rematchPresetId: 'quick', promote: 'multiplayer',
    });
  });

  it('keeps the current rematch once the player is no longer new', () => {
    expect(buildSoloRotation({ gamesPlayed: 4, dailyDoneEver: false })).toEqual({
      rematchPresetId: '', promote: null,
    });
    expect(buildSoloRotation({ gamesPlayed: 0, dailyDoneEver: true })).toEqual({
      rematchPresetId: '', promote: null,
    });
    expect(buildSoloRotation({ gamesPlayed: 2, dailyDoneEver: true })).toEqual({
      rematchPresetId: '', promote: null,
    });
  });
});

describe('dailyDoneEver storage', () => {
  const store: Record<string, string> = {};
  const storage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  };

  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false with no window, no key, and a today-shaped miss that was never written', () => {
    vi.stubGlobal('window', undefined);
    expect(getDailyDoneEver()).toBe(false);
  });

  it('is true when the connections played-today key has any value, including a past date', () => {
    expect(getDailyDoneEver()).toBe(false);
    storage.setItem(CONNECTIONS_PLAYED_KEY, '2020-01-01');
    expect(getDailyDoneEver()).toBe(true);
  });

  it('is true after the never-expiring flag is marked, even with no connections key', () => {
    markDailyDoneEver();
    expect(storage.getItem(DAILY_DONE_EVER_KEY)).toBe('1');
    expect(getDailyDoneEver()).toBe(true);
    expect(buildSoloRotation({ gamesPlayed: 0, dailyDoneEver: getDailyDoneEver() })).toEqual({
      rematchPresetId: '', promote: null,
    });
  });
});
