import { describe, it, expect } from 'vitest';
import { CANONICAL_MODE_BUCKETS, bucketForMode, unbucketedModes } from '../modeBuckets';

/** Every distinct gameMode observed live in analytics_events (2026-05-30). */
const LIVE_GAME_MODES = [
  'adventure', 'adventure-boss', 'arena', 'blast', 'blast_multiplayer',
  'brainGym', 'classic', 'connections', 'multiplayer', 'practice',
  'quickPlay', 'random', 'singleplayer', 'solo-bots', 'survival',
  'tutorial', 'wheel-rush', 'word-hunt', 'word-tower', 'word-wheel',
  'wordCraft', 'wordCraftCards', 'wordCraftGems',
];

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

  it('classifies game TYPE orthogonally to multiplayer-ness', () => {
    // blast and blast_multiplayer are the SAME game type; MP-ness is a separate axis.
    expect(bucketForMode('blast')).toBe('blast');
    expect(bucketForMode('blast_multiplayer')).toBe('blast');
  });

  it('folds variant spellings into their canonical type bucket', () => {
    expect(bucketForMode('adventure-boss')).toBe('adventure');
    expect(bucketForMode('solo-bots')).toBe('singleplayer');
    expect(bucketForMode('wordCraft')).toBe('wordCraft');
    expect(bucketForMode('wordCraftCards')).toBe('wordCraft');
    expect(bucketForMode('wordCraftGems')).toBe('wordCraft');
  });

  it('buckets the previously-unclassified live modes (no longer "other")', () => {
    expect(bucketForMode('arena')).toBe('arena');
    expect(bucketForMode('brainGym')).toBe('brainGym');
    expect(bucketForMode('practice')).toBe('practice');
    expect(bucketForMode('quickPlay')).toBe('quickPlay');
    expect(bucketForMode('tutorial')).toBe('tutorial');
  });

  it('buckets the newly-instrumented modes (word-craft, crossword, brain-drill)', () => {
    expect(bucketForMode('word-craft')).toBe('wordCraft');
    expect(bucketForMode('crossword')).toBe('crossword');
    expect(bucketForMode('brain-drill')).toBe('brainDrill');
  });

  it('leaves NO live gameMode falling through to "other" (except the MP aggregate value)', () => {
    const fellThrough = LIVE_GAME_MODES.filter(
      (m) => m !== 'multiplayer' && bucketForMode(m) === 'other',
    );
    expect(fellThrough).toEqual([]);
  });
});

describe('unbucketedModes (gap guard)', () => {
  it('flags genuinely-new raw modes that have no bucket', () => {
    expect(unbucketedModes(['word-hunt', 'brand-new-mode-2027'])).toEqual([
      'brand-new-mode-2027',
    ]);
  });
  it('does NOT flag the multiplayer aggregate value', () => {
    expect(unbucketedModes(['multiplayer', 'classic'])).toEqual([]);
  });
  it('returns a sorted, de-duplicated list', () => {
    expect(unbucketedModes(['zeta-new', 'alpha-new', 'zeta-new'])).toEqual([
      'alpha-new', 'zeta-new',
    ]);
  });
  it('ignores null/empty entries', () => {
    expect(unbucketedModes([null, undefined, '', 'classic'])).toEqual([]);
  });
});
