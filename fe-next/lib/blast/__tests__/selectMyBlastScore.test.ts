import { describe, it, expect } from 'vitest';
import {
  selectMyBlastScore,
  selectMyBlastRank,
  selectBlastLeaderboardStrip,
  selectMyBlastGap,
} from '../selectMyBlastScore';

const LB = [
  { username: 'alice', score: 1200 },
  { username: 'bob', score: 800 },
  { username: 'carol', score: 450 },
  { username: 'dave', score: 300 },
  { username: 'erin', score: 90 },
];

describe('selectMyBlastScore', () => {
  it('returns the player live score from the leaderboard', () => {
    expect(selectMyBlastScore(LB, 'bob')).toBe(800);
  });

  it('returns 0 when the player is not on the leaderboard yet', () => {
    expect(selectMyBlastScore(LB, 'zoe')).toBe(0);
  });

  it('returns 0 for empty / missing leaderboard or username', () => {
    expect(selectMyBlastScore([], 'bob')).toBe(0);
    expect(selectMyBlastScore(null, 'bob')).toBe(0);
    expect(selectMyBlastScore(undefined, 'bob')).toBe(0);
    expect(selectMyBlastScore(LB, undefined)).toBe(0);
  });
});

describe('selectMyBlastRank', () => {
  it('returns 1-based rank by descending score', () => {
    expect(selectMyBlastRank(LB, 'alice')).toBe(1);
    expect(selectMyBlastRank(LB, 'carol')).toBe(3);
    expect(selectMyBlastRank(LB, 'erin')).toBe(5);
  });

  it('returns null when player absent or input missing', () => {
    expect(selectMyBlastRank(LB, 'zoe')).toBeNull();
    expect(selectMyBlastRank(null, 'alice')).toBeNull();
    expect(selectMyBlastRank(LB, undefined)).toBeNull();
  });

  it('does not mutate the input array', () => {
    const copy = [...LB];
    selectMyBlastRank(LB, 'bob');
    expect(LB).toEqual(copy);
  });
});

describe('selectBlastLeaderboardStrip', () => {
  it('returns all rows sorted by score when under the max', () => {
    const rows = selectBlastLeaderboardStrip(LB.slice(0, 3), 'bob', 4);
    expect(rows.map((r) => r.entry.username)).toEqual(['alice', 'bob', 'carol']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('flags the current player with isMe', () => {
    const rows = selectBlastLeaderboardStrip(LB, 'bob', 4);
    expect(rows.find((r) => r.isMe)?.entry.username).toBe('bob');
  });

  it('always includes the current player even when outside the visible slice', () => {
    const rows = selectBlastLeaderboardStrip(LB, 'erin', 4);
    // erin is rank 5 — must still appear, with her true rank, in the last slot
    const me = rows.find((r) => r.isMe);
    expect(me).toBeTruthy();
    expect(me?.entry.username).toBe('erin');
    expect(me?.rank).toBe(5);
    expect(rows).toHaveLength(4);
    // The top two leaders are preserved
    expect(rows[0].entry.username).toBe('alice');
    expect(rows[1].entry.username).toBe('bob');
  });

  it('keeps the natural top slice when the player is already inside it', () => {
    const rows = selectBlastLeaderboardStrip(LB, 'alice', 4);
    expect(rows.map((r) => r.entry.username)).toEqual(['alice', 'bob', 'carol', 'dave']);
  });

  it('returns [] for empty leaderboard', () => {
    expect(selectBlastLeaderboardStrip([], 'bob')).toEqual([]);
    expect(selectBlastLeaderboardStrip(null, 'bob')).toEqual([]);
  });
});

describe('selectMyBlastGap', () => {
  it('reports the lead over the runner-up when the player is #1', () => {
    expect(selectMyBlastGap(LB, 'alice')).toEqual({ kind: 'lead', points: 400 });
  });

  it('reports the points to catch the player directly above when not #1', () => {
    // bob (800) trails alice (1200) by 400
    expect(selectMyBlastGap(LB, 'bob')).toEqual({ kind: 'behind', points: 400 });
    // erin (90) trails dave (300) by 210
    expect(selectMyBlastGap(LB, 'erin')).toEqual({ kind: 'behind', points: 210 });
  });

  it('returns null when there is no rival to compare against (solo on the board)', () => {
    expect(selectMyBlastGap([{ username: 'alice', score: 1200 }], 'alice')).toBeNull();
  });

  it('returns null when the player is absent or input is missing', () => {
    expect(selectMyBlastGap(LB, 'zoe')).toBeNull();
    expect(selectMyBlastGap(null, 'alice')).toBeNull();
    expect(selectMyBlastGap(LB, undefined)).toBeNull();
  });

  it('handles ties (gap of 0) without crashing', () => {
    const tied = [
      { username: 'alice', score: 500 },
      { username: 'bob', score: 500 },
    ];
    expect(selectMyBlastGap(tied, 'alice')).toEqual({ kind: 'lead', points: 0 });
    expect(selectMyBlastGap(tied, 'bob')).toEqual({ kind: 'behind', points: 0 });
  });

  it('does not mutate the input array', () => {
    const copy = [...LB];
    selectMyBlastGap(LB, 'bob');
    expect(LB).toEqual(copy);
  });
});
