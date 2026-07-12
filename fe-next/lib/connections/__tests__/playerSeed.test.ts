import { describe, it, expect, beforeEach } from 'vitest';
import { getPlayerSeed, PLAYER_SEED_KEY } from '../playerSeed';

describe('getPlayerSeed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('generates a positive integer seed and persists it', () => {
    const seed = getPlayerSeed();
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
    expect(window.localStorage.getItem(PLAYER_SEED_KEY)).toBe(String(seed));
  });

  it('returns the same seed on subsequent calls', () => {
    const a = getPlayerSeed();
    const b = getPlayerSeed();
    expect(b).toBe(a);
  });

  it('recovers from a corrupted stored value', () => {
    window.localStorage.setItem(PLAYER_SEED_KEY, 'garbage');
    const seed = getPlayerSeed();
    expect(seed).toBeGreaterThan(0);
    expect(window.localStorage.getItem(PLAYER_SEED_KEY)).toBe(String(seed));
  });
});
