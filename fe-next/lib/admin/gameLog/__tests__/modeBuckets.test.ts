import { describe, it, expect } from 'vitest';
import { CANONICAL_MODE_BUCKETS, bucketForMode } from '../modeBuckets';

describe('CANONICAL_MODE_BUCKETS', () => {
  it('has a unique key per bucket', () => {
    const keys = CANONICAL_MODE_BUCKETS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('covers both word-wheel gameMode spellings in one bucket', () => {
    const wheel = CANONICAL_MODE_BUCKETS.find((b) => b.key === 'wordWheel');
    expect(wheel?.modes).toEqual(expect.arrayContaining(['wheel-rush', 'word-wheel']));
  });
  it('marks the multiplayer bucket as a multiplayer aggregate', () => {
    const mp = CANONICAL_MODE_BUCKETS.find((b) => b.key === 'multiplayer');
    expect(mp?.multiplayer).toBe(true);
  });
  it('no gameMode value belongs to more than one mode bucket', () => {
    const seen = new Map<string, string>();
    for (const b of CANONICAL_MODE_BUCKETS) {
      if (b.multiplayer) continue; // mp aggregate overlaps by design
      for (const m of b.modes) {
        expect(seen.has(m)).toBe(false);
        seen.set(m, b.key);
      }
    }
  });
});

describe('bucketForMode', () => {
  it('maps known raw modes to their bucket key', () => {
    expect(bucketForMode('word-hunt')).toBe('wordHunt');
    expect(bucketForMode('wheel-rush')).toBe('wordWheel');
    expect(bucketForMode('word-wheel')).toBe('wordWheel');
    expect(bucketForMode('classic')).toBe('classic');
    expect(bucketForMode('survival')).toBe('survival');
    expect(bucketForMode('blast')).toBe('blast');
  });
  it('returns "other" for unmapped modes', () => {
    expect(bucketForMode('totally-new-mode')).toBe('other');
    expect(bucketForMode(null)).toBe('other');
  });
});
