import { describe, it, expect } from 'vitest';
import { pickCoachExampleWord, stageWantsExampleWord } from '../mpStuckCoach';

describe('pickCoachExampleWord', () => {
  it('prefers a short easy word — the point is a word they can actually trace', () => {
    expect(pickCoachExampleWord({ easy: ['CAT', 'ELEPHANT'], medium: [], hard: [] })).toBe('CAT');
  });

  it('falls back through medium then hard rather than showing nothing', () => {
    expect(pickCoachExampleWord({ easy: [], medium: ['TREE'], hard: ['XYLEM'] })).toBe('TREE');
    expect(pickCoachExampleWord({ easy: [], medium: [], hard: ['XYLEM'] })).toBe('XYLEM');
  });

  it('skips words too long to demo and words too short to feel like a word', () => {
    expect(pickCoachExampleWord({ easy: ['A', 'CONSTITUTIONAL', 'DOG'], medium: [], hard: [] })).toBe('DOG');
  });

  it('prefers the shortest usable word so the 3-tile diagram matches the caption', () => {
    expect(pickCoachExampleWord({ easy: ['STAIR', 'CAT', 'TREE'], medium: [], hard: [] })).toBe('CAT');
  });

  it('returns null when the grid yields nothing usable, so the card just stays generic', () => {
    expect(pickCoachExampleWord({ easy: [], medium: [], hard: [] })).toBeNull();
    expect(pickCoachExampleWord(null)).toBeNull();
  });
});

describe('stageWantsExampleWord', () => {
  it('offers a concrete word for the gesture-confusion stages', () => {
    // 125 people/30d saw idle-nudge and 70% ignored it. Someone who cannot find
    // a word does not need to be told "drag across letters" — they need to be
    // shown WHICH letters.
    expect(stageWantsExampleWord('idle-nudge')).toBe(true);
    expect(stageWantsExampleWord('tap-hint')).toBe(true);
    expect(stageWantsExampleWord('validity-hint')).toBe(true);
  });

  it('stays quiet for submit-hint, where the player already found a word', () => {
    // They built a path — they understand the board. Handing them a different
    // word would talk past the actual problem (they never lifted their finger).
    expect(stageWantsExampleWord('submit-hint')).toBe(false);
    expect(stageWantsExampleWord('none')).toBe(false);
  });
});
