import { describe, expect, it } from 'vitest';
import { clearParty, loadParty, PARTY_STORAGE_KEY, saveParty } from '../persist';
import { createPartyGame } from '../engine';
import { defaultPartySetup } from '../setup';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  } as Storage;
}

describe('party persist', () => {
  it('round-trips an in-progress game and resumes it', () => {
    const storage = memoryStorage();
    const game = createPartyGame(defaultPartySetup('en'));
    saveParty(game, storage);
    expect(storage.getItem(PARTY_STORAGE_KEY)).toBeTruthy();
    const loaded = loadParty(storage);
    expect(loaded?.setup.players).toHaveLength(2);
    expect(loaded?.phase).toBe(game.phase);
    expect(loaded?.board).toEqual(game.board);
  });

  it('returns null for missing or corrupt payloads', () => {
    const storage = memoryStorage();
    expect(loadParty(storage)).toBeNull();
    storage.setItem(PARTY_STORAGE_KEY, '{not-json');
    expect(loadParty(storage)).toBeNull();
    storage.setItem(PARTY_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadParty(storage)).toBeNull();
  });

  it('clearParty drops the resume blob', () => {
    const storage = memoryStorage();
    saveParty(createPartyGame(defaultPartySetup('he')), storage);
    clearParty(storage);
    expect(loadParty(storage)).toBeNull();
  });
});
