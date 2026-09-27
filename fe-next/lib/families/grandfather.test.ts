/**
 * Grandfathering — existing users are treated as adults; only NEW users
 * (post-cutoff signups / fresh installs) go through the age gate.
 *
 * Guest decision is made ONCE at first bootstrap after ship and persisted
 * ('1' existing / '0' fresh) so a fresh install that later plays a game can
 * never retroactively look like an existing user.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  GRANDFATHER_CUTOFF_MS,
  GUEST_GRANDFATHER_KEY,
  resolveGrandfatheredAdult,
} from './grandfather';

function makeFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

let storage: Storage;

beforeEach(() => {
  storage = makeFakeStorage();
  (globalThis as Record<string, unknown>).window = { localStorage: storage };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe('resolveGrandfatheredAdult — authenticated', () => {
  it('grandfathers an authed profile created before the cutoff', () => {
    const before = new Date(GRANDFATHER_CUTOFF_MS - 86_400_000).toISOString();
    expect(
      resolveGrandfatheredAdult({ isAuthenticated: true, profileCreatedAt: before }),
    ).toBe(true);
  });

  it('does NOT grandfather an authed profile created after the cutoff', () => {
    const after = new Date(GRANDFATHER_CUTOFF_MS + 86_400_000).toISOString();
    expect(
      resolveGrandfatheredAdult({ isAuthenticated: true, profileCreatedAt: after }),
    ).toBe(false);
  });

  it('fails closed when created_at is missing or unparsable', () => {
    expect(resolveGrandfatheredAdult({ isAuthenticated: true, profileCreatedAt: null })).toBe(false);
    expect(resolveGrandfatheredAdult({ isAuthenticated: true })).toBe(false);
    expect(
      resolveGrandfatheredAdult({ isAuthenticated: true, profileCreatedAt: 'not-a-date' }),
    ).toBe(false);
  });
});

describe('resolveGrandfatheredAdult — guest bootstrap decision', () => {
  it('grandfathers a guest with prior-install evidence and persists the decision', () => {
    storage.setItem('lc_first_played_modes_v1', '{"wordWheel":true}');
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(true);
    expect(storage.getItem(GUEST_GRANDFATHER_KEY)).toBe('1');
  });

  it('accepts any single evidence key (coins)', () => {
    storage.setItem('lexiclash_coins', '{"coins":40}');
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(true);
  });

  it('marks a fresh install as NOT grandfathered and persists that decision', () => {
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(false);
    expect(storage.getItem(GUEST_GRANDFATHER_KEY)).toBe('0');
  });

  it('decision is sticky: evidence appearing AFTER the fresh-install decision does not flip it', () => {
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(false);
    // fresh install now plays a game → evidence key appears
    storage.setItem('lc_first_played_modes_v1', '{"boggle":true}');
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(false);
  });

  it('honors a pre-existing "1" decision without re-deriving', () => {
    storage.setItem(GUEST_GRANDFATHER_KEY, '1');
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(true);
  });

  it('fails closed when storage is unavailable', () => {
    delete (globalThis as Record<string, unknown>).window;
    expect(resolveGrandfatheredAdult({ isAuthenticated: false })).toBe(false);
  });
});
