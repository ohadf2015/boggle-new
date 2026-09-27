import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SOLO_GAMES_PLAYED_KEY,
  getSoloGamesPlayed,
  incrementSoloGamesPlayed,
} from '../soloGamesPlayed';

function makeStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    _store: store,
  };
}

describe('soloGamesPlayed', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('window', { localStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 0 when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    expect(getSoloGamesPlayed()).toBe(0);
    expect(incrementSoloGamesPlayed()).toBe(0);
  });

  it('returns 0 when the key is absent or not a JSON number', () => {
    expect(getSoloGamesPlayed()).toBe(0);
    storage.setItem(SOLO_GAMES_PLAYED_KEY, 'nope');
    expect(getSoloGamesPlayed()).toBe(0);
    storage.setItem(SOLO_GAMES_PLAYED_KEY, JSON.stringify(-2));
    expect(getSoloGamesPlayed()).toBe(0);
    storage.setItem(SOLO_GAMES_PLAYED_KEY, JSON.stringify('3'));
    expect(getSoloGamesPlayed()).toBe(0);
  });

  it('increments once per call and persists a JSON number', () => {
    expect(incrementSoloGamesPlayed()).toBe(1);
    expect(storage.getItem(SOLO_GAMES_PLAYED_KEY)).toBe('1');
    expect(getSoloGamesPlayed()).toBe(1);
    expect(incrementSoloGamesPlayed()).toBe(2);
    expect(JSON.parse(storage.getItem(SOLO_GAMES_PLAYED_KEY) as string)).toBe(2);
  });
});
