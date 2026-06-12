import { describe, it, expect } from 'vitest';
import { pickBlastResultKind } from '../resultKind';

describe('pickBlastResultKind', () => {
  it('returns null for an ordinary 1-2 star clear (no cinematic)', () => {
    expect(pickBlastResultKind({ stars: 1 })).toBeNull();
    expect(pickBlastResultKind({ stars: 2 })).toBeNull();
  });

  it('returns null for a partial board-clear with no bonus or chest', () => {
    expect(pickBlastResultKind({ stars: 1, completionReason: 'partial' })).toBeNull();
  });

  it('returns "mission-complete" whenever the chest is ready (highest priority)', () => {
    expect(pickBlastResultKind({ stars: 1, chestReady: true })).toBe('mission-complete');
    // chest beats even a 3-star run
    expect(pickBlastResultKind({ stars: 3, chestReady: true })).toBe('mission-complete');
  });

  it('returns "bingo" for a flawless 3-star run', () => {
    expect(pickBlastResultKind({ stars: 3 })).toBe('bingo');
  });

  it('returns "explorer" for a treasure-hunt bonus haul (>=2 bonus words)', () => {
    expect(pickBlastResultKind({ stars: 2, bonusWordsFound: 2 })).toBe('explorer');
    expect(pickBlastResultKind({ stars: 1, bonusWordsFound: 5 })).toBe('explorer');
  });

  it('prefers the 3-star bingo over the bonus explorer when both apply', () => {
    expect(pickBlastResultKind({ stars: 3, bonusWordsFound: 4 })).toBe('bingo');
  });
});
