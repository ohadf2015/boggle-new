import { describe, it, expect } from 'vitest';
import { buildLeaderboardView, type RosterPlayerInput, type PrevSnapshotEntry } from './leaderboardView';

function p(over: Partial<RosterPlayerInput> & { userId: string; score: number }): RosterPlayerInput {
  return {
    username: over.userId,
    status: 'connected',
    ...over,
  };
}

describe('buildLeaderboardView', () => {
  it('sorts players by score descending and assigns 1-based ranks', () => {
    // Given an unsorted list
    const players = [p({ userId: 'a', score: 10 }), p({ userId: 'b', score: 30 }), p({ userId: 'c', score: 20 })];

    // When building the view with no prior snapshot
    const { rows } = buildLeaderboardView(players, new Map());

    // Then highest score is rank 1
    expect(rows.map(r => r.userId)).toEqual(['b', 'c', 'a']);
    expect(rows.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it('reports zero deltas and stable ranks on the first render (empty prev)', () => {
    const players = [p({ userId: 'a', score: 10 }), p({ userId: 'b', score: 30 })];

    const { rows } = buildLeaderboardView(players, new Map());

    for (const r of rows) {
      expect(r.rankDelta).toBe(0);
      expect(r.scoreDelta).toBe(0);
    }
  });

  it('detects a player overtaking the leader (positive rankDelta + scoreDelta)', () => {
    // Given a prior snapshot where b leads (rank 1) and a is rank 2
    const prev: Map<string, PrevSnapshotEntry> = new Map([
      ['b', { rank: 1, score: 30 }],
      ['a', { rank: 2, score: 10 }],
    ]);
    // When a surges past b
    const players = [p({ userId: 'a', score: 50 }), p({ userId: 'b', score: 30 })];

    const { rows } = buildLeaderboardView(players, prev);
    const a = rows.find(r => r.userId === 'a')!;
    const b = rows.find(r => r.userId === 'b')!;

    // Then a moved up one place (prevRank 2 -> 1 = +1) and gained 40 points
    expect(a.rank).toBe(1);
    expect(a.rankDelta).toBe(1);
    expect(a.scoreDelta).toBe(40);
    expect(a.isLeader).toBe(true);
    // And b dropped (prevRank 1 -> 2 = -1) with no score change
    expect(b.rank).toBe(2);
    expect(b.rankDelta).toBe(-1);
    expect(b.scoreDelta).toBe(0);
    expect(b.isLeader).toBe(false);
  });

  it('does not crown a leader while every score is still zero (game start)', () => {
    const players = [p({ userId: 'a', score: 0 }), p({ userId: 'b', score: 0 })];

    const { rows } = buildLeaderboardView(players, new Map());

    expect(rows.every(r => r.isLeader === false)).toBe(true);
  });

  it('computes pctOfMax relative to the top score and floors the divisor at 1', () => {
    const players = [p({ userId: 'a', score: 40 }), p({ userId: 'b', score: 10 })];

    const { rows } = buildLeaderboardView(players, new Map());

    expect(rows.find(r => r.userId === 'a')!.pctOfMax).toBe(100);
    expect(rows.find(r => r.userId === 'b')!.pctOfMax).toBe(25);

    // all-zero scores must not divide by zero
    const zero = buildLeaderboardView([p({ userId: 'a', score: 0 })], new Map());
    expect(zero.rows[0].pctOfMax).toBe(0);
  });

  it('emits a snapshot that round-trips to zero deltas on identical input', () => {
    const players = [p({ userId: 'a', score: 40 }), p({ userId: 'b', score: 10 })];

    const first = buildLeaderboardView(players, new Map());
    // Feeding the produced snapshot back with the same scores => nothing moved
    const second = buildLeaderboardView(players, first.snapshot);

    for (const r of second.rows) {
      expect(r.rankDelta).toBe(0);
      expect(r.scoreDelta).toBe(0);
    }
  });

  it('treats a player absent from prev (joined mid-game) as neutral, not a mover', () => {
    const prev: Map<string, PrevSnapshotEntry> = new Map([['a', { rank: 1, score: 10 }]]);
    const players = [p({ userId: 'a', score: 10 }), p({ userId: 'c', score: 5 })];

    const { rows } = buildLeaderboardView(players, prev);
    const c = rows.find(r => r.userId === 'c')!;

    expect(c.rankDelta).toBe(0);
    expect(c.scoreDelta).toBe(0);
  });
});
