import { describe, it, expect } from 'vitest';
import { classroomRival, mpH2hRival, rivalWindow } from '../pickers';

describe('classroomRival', () => {
  it('Given the class standings, Then the student just above me is the rival with the gap', () => {
    const r = classroomRival([
      { username: 'Ann', score: 50, rank: 1 },
      { username: 'Ben', score: 40, rank: 2 },
      { username: 'Me', score: 30, rank: 3 },
    ], 'Me');
    expect(r).toEqual({ kind: 'classroom', name: 'Ben', theirScore: 40, myScore: 30, gap: 10 });
  });

  it('Given I am first, Then the runner-up is the rival I beat', () => {
    const r = classroomRival([{ username: 'Me', score: 50, rank: 1 }, { username: 'Ben', score: 40, rank: 2 }], 'Me');
    expect(r).toMatchObject({ name: 'Ben', gap: -10 });
  });

  it('Given I am alone or missing, Then there is no rival', () => {
    expect(classroomRival([{ username: 'Me', score: 1, rank: 1 }], 'Me')).toBeNull();
    expect(classroomRival([{ username: 'A', score: 1, rank: 1 }], 'Me')).toBeNull();
  });
});

describe('mpH2hRival', () => {
  it('Given the live room record against a signed-in opponent, Then it becomes an h2h rival card', () => {
    expect(mpH2hRival({ username: 'Maya', userId: 'u-maya' }, { name: 'Maya', myWins: 2, theirWins: 4, meetings: 6 })).toEqual({
      kind: 'h2h', userId: 'u-maya', name: 'Maya', record: { wins: 2, losses: 4, draws: 0 },
    });
  });

  it('Given no opponent or no record, Then there is no rival', () => {
    expect(mpH2hRival(null, { name: 'Maya', myWins: 1, theirWins: 1, meetings: 2 })).toBeNull();
    expect(mpH2hRival({ username: 'Maya', userId: 'u-maya' }, null)).toBeNull();
  });
});

describe('rivalWindow', () => {
  it('Given a small or a big score, Then the window is max(20, 10%)', () => {
    expect(rivalWindow(100)).toBe(20);
    expect(rivalWindow(1000)).toBe(100);
  });
});
