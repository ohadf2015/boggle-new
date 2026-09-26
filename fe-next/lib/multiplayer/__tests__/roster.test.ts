import { describe, it, expect } from 'vitest';
import { toMpRoster, rosterSeedFromJoined, rankOf } from '../roster';

/**
 * `toMpRoster` is the ONE roster source for host and joiner (pitfall class 3).
 * Baseline capture 2026-09-26: the joiner's desktop roster read "PLAYERS 0"
 * while the host's read 4 — the joiner's view only knew `updateLeaderboard`,
 * the host's only knew `updateUsers`. Merging both here means neither side can
 * show an empty room that is not empty.
 */
describe('toMpRoster — merges updateUsers with updateLeaderboard', () => {
  const users = [
    { username: 'Ana', isHost: true, presenceStatus: 'active' },
    { username: 'Bot1', isBot: true, presenceStatus: 'active' },
    { username: 'Cy', presenceStatus: 'idle' },
  ];

  it('lists every seated user even before any score arrives (the PLAYERS 0 bug)', () => {
    const roster = toMpRoster([], users, 'Cy');
    expect(roster.map((p) => p.id).sort()).toEqual(['Ana', 'Bot1', 'Cy']);
    expect(roster.every((p) => p.score === 0)).toBe(true);
  });

  it('lists leaderboard players even when the users list is empty (joiner side)', () => {
    const roster = toMpRoster([{ username: 'Ana', score: 12 }, { username: 'Cy', score: 4 }], [], 'Cy');
    expect(roster.map((p) => p.id)).toEqual(['Ana', 'Cy']);
    expect(roster[0].score).toBe(12);
  });

  it('sorts by score, best first, and ranks with shared ranks for ties', () => {
    const roster = toMpRoster(
      [{ username: 'Ana', score: 5 }, { username: 'Bot1', score: 9 }, { username: 'Cy', score: 5 }],
      users,
      'Cy',
    );
    expect(roster.map((p) => [p.id, p.rank])).toEqual([['Bot1', 1], ['Ana', 2], ['Cy', 2]]);
  });

  it('carries host / bot flags from either source', () => {
    const roster = toMpRoster([{ username: 'Ana', score: 0 }], users, 'Cy');
    expect(roster.find((p) => p.id === 'Ana')?.isHost).toBe(true);
    expect(roster.find((p) => p.id === 'Bot1')?.isBot).toBe(true);
    const lbOnly = toMpRoster([{ username: 'Zed', score: 1, isBot: true, isHost: false }], [], 'Cy');
    expect(lbOnly[0].isBot).toBe(true);
  });

  it('maps presence to a connection state', () => {
    const roster = toMpRoster([], users, 'Cy');
    expect(roster.find((p) => p.id === 'Ana')?.conn).toBe('ok');
    expect(roster.find((p) => p.id === 'Cy')?.conn).toBe('away');
  });

  it('marks a scored player who left the room as gone when the users list is known', () => {
    const roster = toMpRoster([{ username: 'Gone', score: 3 }], users, 'Cy');
    expect(roster.find((p) => p.id === 'Gone')?.conn).toBe('gone');
  });

  it('flags ready players from readyUsernames', () => {
    const roster = toMpRoster([], users, 'Cy', { readyUsernames: ['Cy'] });
    expect(roster.find((p) => p.id === 'Cy')?.isReady).toBe(true);
    expect(roster.find((p) => p.id === 'Ana')?.isReady).toBe(false);
  });

  it('computes lastGain against the previous roster', () => {
    const prev = toMpRoster([{ username: 'Ana', score: 5 }], users, 'Cy');
    const next = toMpRoster([{ username: 'Ana', score: 8 }], users, 'Cy', { previous: prev });
    expect(next.find((p) => p.id === 'Ana')?.lastGain).toBe(3);
    expect(next.find((p) => p.id === 'Cy')?.lastGain).toBe(0);
  });

  it('tolerates undefined inputs', () => {
    expect(toMpRoster(undefined, undefined, 'x')).toEqual([]);
  });

  it('rankOf returns my rank and the total', () => {
    const roster = toMpRoster([{ username: 'Ana', score: 5 }, { username: 'Cy', score: 1 }], users, 'Cy');
    expect(rankOf(roster, 'Cy')).toEqual({ rank: 2, total: 3 }); // Ana 5, Cy 1, Bot1 0
    expect(rankOf(roster, 'nobody')).toEqual({ rank: 0, total: 3 });
  });
});

describe('rosterSeedFromJoined — the lobby is seeded by the joined payload', () => {
  it('returns the users array the server put on `joined`', () => {
    const users = [{ username: 'Ana', isHost: true }];
    expect(rosterSeedFromJoined({ users })).toBe(users);
  });

  it('returns null when the payload has no users (older server) so the caller keeps its roster', () => {
    expect(rosterSeedFromJoined({})).toBeNull();
    expect(rosterSeedFromJoined({ users: 'nope' as unknown as [] })).toBeNull();
  });

  it('returns an empty array as-is (an empty room is still a fact)', () => {
    expect(rosterSeedFromJoined({ users: [] })).toEqual([]);
  });
});

describe('toRosterPlayers — desktop rail shape, now merged with the seat list', () => {
  it('keeps the leaderboard order and fields when no seat list is given (back-compat)', async () => {
    const { toRosterPlayers } = await import('../roster');
    const out = toRosterPlayers([{ username: 'me', score: 10, wordCount: 3 }, { username: 'b', score: 8 }], 'me');
    expect(out).toEqual([
      { userId: 'me', username: 'me', score: 10, wordCount: 3, status: 'connected', isYou: true },
      { userId: 'b', username: 'b', score: 8, wordCount: undefined, status: 'connected', isYou: false },
    ]);
  });

  it('adds seated players the leaderboard has not scored yet (joiner "PLAYERS 0")', async () => {
    const { toRosterPlayers } = await import('../roster');
    const out = toRosterPlayers([], 'me', [{ username: 'host', isHost: true }, { username: 'me' }]);
    expect(out.map((p) => p.userId)).toEqual(['host', 'me']);
    expect(out.every((p) => p.score === 0 && p.status === 'connected')).toBe(true);
    expect(out.find((p) => p.userId === 'me')?.isYou).toBe(true);
  });

  it('does not duplicate a player present in both lists', async () => {
    const { toRosterPlayers } = await import('../roster');
    const out = toRosterPlayers([{ username: 'me', score: 4 }], 'me', [{ username: 'me' }, { username: 'x' }]);
    expect(out.map((p) => p.userId)).toEqual(['me', 'x']);
  });
});
