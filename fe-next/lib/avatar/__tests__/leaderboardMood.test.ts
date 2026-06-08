import { describe, it, expect } from 'vitest';
import {
  deriveLeaderboardMood,
  BIG_WORD_THRESHOLD,
} from '@/lib/avatar/leaderboardMood';

describe('deriveLeaderboardMood', () => {
  it('returns null on an idle tick (no score gain, no rank move, no combo)', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 0, rankChange: 0, comboLevel: 0 }),
    ).toBeNull();
  });

  it('reacts to an ordinary score gain with "correct"', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 5, rankChange: 0, comboLevel: 0 }),
    ).toBe('correct');
  });

  it('reacts to a big-word score gain with "streak" (flame eyes)', () => {
    expect(
      deriveLeaderboardMood({
        scoreChange: BIG_WORD_THRESHOLD,
        rankChange: 0,
        comboLevel: 0,
      }),
    ).toBe('streak');
  });

  it('reacts to overtaking someone with "correct" (smug celebration)', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 5, rankChange: 1, comboLevel: 0 }),
    ).toBe('correct');
  });

  it('reacts to being overtaken with "emoteShock" (flinch)', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 0, rankChange: -1, comboLevel: 0 }),
    ).toBe('emoteShock');
  });

  it('shows "streak" for a sustained high combo with no other event', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 0, rankChange: 0, comboLevel: 10 }),
    ).toBe('streak');
  });

  it('does NOT show sustained-combo streak below the combo threshold', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 0, rankChange: 0, comboLevel: 9 }),
    ).toBeNull();
  });

  // Priority collisions — the most dramatic / most-easily-lost beat wins.
  it('prioritizes being overtaken over a simultaneous score gain', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 3, rankChange: -1, comboLevel: 0 }),
    ).toBe('emoteShock');
  });

  it('prioritizes overtaking over a big-word gain in the same tick', () => {
    expect(
      deriveLeaderboardMood({
        scoreChange: BIG_WORD_THRESHOLD,
        rankChange: 1,
        comboLevel: 0,
      }),
    ).toBe('correct');
  });

  it('prioritizes a big-word gain over a sustained combo', () => {
    expect(
      deriveLeaderboardMood({
        scoreChange: BIG_WORD_THRESHOLD,
        rankChange: 0,
        comboLevel: 15,
      }),
    ).toBe('streak'); // both map to streak here, but big-word path must win cleanly
  });

  it('prioritizes an ordinary gain over a sustained combo', () => {
    expect(
      deriveLeaderboardMood({ scoreChange: 4, rankChange: 0, comboLevel: 12 }),
    ).toBe('correct');
  });
});
