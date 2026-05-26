import { describe, expect, it } from 'vitest';
import { pickCelebrationKind } from '../celebrationKind';

describe('pickCelebrationKind', () => {
  it('returns "bingo" when hadBingo even at last place', () => {
    expect(pickCelebrationKind({ rank: 4, totalPlayers: 4, hadBingo: true })).toBe('bingo');
  });

  it('returns "bingo" for daily perfect score', () => {
    expect(pickCelebrationKind({ daily: { perfectScore: true } })).toBe('bingo');
  });

  it('prioritizes streak milestone over generic placement', () => {
    expect(pickCelebrationKind({ rank: 1, daily: { streakMilestone: true } })).toBe('streak');
  });

  it('returns "mission-complete" for all-dailies-done', () => {
    expect(pickCelebrationKind({ daily: { allDailiesDone: true } })).toBe('mission-complete');
  });

  it('returns "explorer" for first daily visit today', () => {
    expect(pickCelebrationKind({ daily: { firstVisitToday: true } })).toBe('explorer');
  });

  it('returns "champion" for rank=1 with no daily/bingo signals', () => {
    expect(pickCelebrationKind({ rank: 1, totalPlayers: 4 })).toBe('champion');
  });

  it('returns "runner-up" for rank=2 and rank=3', () => {
    expect(pickCelebrationKind({ rank: 2, totalPlayers: 4 })).toBe('runner-up');
    expect(pickCelebrationKind({ rank: 3, totalPlayers: 4 })).toBe('runner-up');
  });

  it('returns "defeat" only for last place in a >=2 player match', () => {
    expect(pickCelebrationKind({ rank: 4, totalPlayers: 4 })).toBe('defeat');
    expect(pickCelebrationKind({ rank: 2, totalPlayers: 2 })).toBe('defeat');
  });

  it('returns null for middle-of-pack with no signals', () => {
    expect(pickCelebrationKind({ rank: 4, totalPlayers: 8 })).toBe(null);
  });

  it('returns null for empty input', () => {
    expect(pickCelebrationKind({})).toBe(null);
  });

  it('does not treat solo (totalPlayers=1) rank=1 as "defeat" overlap', () => {
    expect(pickCelebrationKind({ rank: 1, totalPlayers: 1 })).toBe('champion');
  });
});
