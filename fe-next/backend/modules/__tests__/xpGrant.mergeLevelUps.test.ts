import { describe, it, expect } from 'vitest';
import { mergeLevelUps } from '../xpGrant';

describe('mergeLevelUps', () => {
  it('returns null when neither side leveled up', () => {
    expect(mergeLevelUps(null, null)).toBeNull();
    expect(mergeLevelUps(undefined, null)).toBeNull();
  });

  it('returns the one side that leveled up', () => {
    expect(mergeLevelUps({ oldLevel: 4, newLevel: 5 }, null)).toEqual({ oldLevel: 4, newLevel: 5 });
    expect(mergeLevelUps(null, { oldLevel: 5, newLevel: 6 })).toEqual({ oldLevel: 5, newLevel: 6 });
  });

  it('spans both jumps whichever order the grants landed in', () => {
    expect(mergeLevelUps({ oldLevel: 4, newLevel: 5 }, { oldLevel: 5, newLevel: 7 })).toEqual({ oldLevel: 4, newLevel: 7 });
    expect(mergeLevelUps({ oldLevel: 5, newLevel: 7 }, { oldLevel: 4, newLevel: 5 })).toEqual({ oldLevel: 4, newLevel: 7 });
  });
});
