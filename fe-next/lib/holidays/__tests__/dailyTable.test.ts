import { describe, expect, it } from 'vitest';
import {
  TABLE_GOAL_PER_MEMBER,
  bestPerMemberDay,
  groupGoal,
  isTableCode,
  newTableCode,
  tableBoard,
} from '../dailyTable';

describe('table codes', () => {
  it('Given a new code, Then it is 8 unambiguous characters and validates', () => {
    const code = newTableCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(isTableCode(code)).toBe(true);
  });

  it('Given junk, Then it is not a code', () => {
    expect(isTableCode('abc')).toBe(false);
    expect(isTableCode('ABCDEFG0')).toBe(false);
    expect(isTableCode(undefined)).toBe(false);
  });

  it('Given many codes, Then they do not collide', () => {
    expect(new Set(Array.from({ length: 200 }, newTableCode)).size).toBe(200);
  });
});

describe('groupGoal', () => {
  it('Given members, Then the nightly goal grows with the table', () => {
    expect(groupGoal(1)).toBe(TABLE_GOAL_PER_MEMBER);
    expect(groupGoal(4)).toBe(4 * TABLE_GOAL_PER_MEMBER);
    expect(groupGoal(0)).toBe(TABLE_GOAL_PER_MEMBER);
  });
});

describe('bestPerMemberDay', () => {
  it('Given one member playing two languages the same day, Then only the best counts', () => {
    const out = bestPerMemberDay([
      { player_id: 'a', puzzle_date: '2026-12-05', efficiency_score: 300 },
      { player_id: 'a', puzzle_date: '2026-12-05', efficiency_score: 500 },
      { player_id: 'b', puzzle_date: '2026-12-05', efficiency_score: null },
    ]);
    expect(out).toEqual([
      { userId: 'a', date: '2026-12-05', score: 500 },
      { userId: 'b', date: '2026-12-05', score: 0 },
    ]);
  });
});

describe('tableBoard', () => {
  const days = ['2026-12-04', '2026-12-05', '2026-12-06'];
  const scores = [
    { userId: 'a', date: '2026-12-04', score: 700 },
    { userId: 'b', date: '2026-12-04', score: 200 },
    { userId: 'a', date: '2026-12-05', score: 100 },
    { userId: 'b', date: '2026-12-06', score: 50 },
  ];

  it('Given scores, Then each night totals the table and lights when it meets the goal', () => {
    const board = tableBoard({ trackDays: days, memberIds: ['a', 'b'], scores, today: '2026-12-05' });
    expect(board.goal).toBe(groupGoal(2));
    expect(board.nights.map((n) => [n.total, n.lit])).toEqual([
      [900, 900 >= groupGoal(2)],
      [100, false],
      [50, false],
    ]);
    expect(board.today).toEqual({ date: '2026-12-05', total: 100, playedIds: ['a'] });
  });

  it('Given scores, Then the leaderboard ranks members by their event total', () => {
    const board = tableBoard({ trackDays: days, memberIds: ['a', 'b', 'c'], scores, today: '2026-12-05' });
    expect(board.leaderboard).toEqual([
      { userId: 'a', total: 800, rank: 1 },
      { userId: 'b', total: 250, rank: 2 },
      { userId: 'c', total: 0, rank: 3 },
    ]);
  });

  it('Given a score from someone who left or outside the track, Then it is ignored', () => {
    const board = tableBoard({
      trackDays: days,
      memberIds: ['a'],
      scores: [...scores, { userId: 'a', date: '2026-12-20', score: 999 }],
      today: '2026-12-05',
    });
    expect(board.nights[0].total).toBe(700);
    expect(board.leaderboard).toEqual([{ userId: 'a', total: 800, rank: 1 }]);
  });
});
