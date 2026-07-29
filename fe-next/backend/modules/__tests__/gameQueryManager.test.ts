import { describe, it, expect } from 'vitest';
import { isRoomEmpty, getEmptyRooms, type QueryGameBase } from '../gameQueryManager';

function user(overrides: Partial<{ disconnected: boolean; disconnectedAt: number; isBot: boolean; isHost: boolean }> = {}) {
  return {
    socketId: 's1',
    isHost: false,
    disconnected: false,
    isBot: false,
    ...overrides,
  } as unknown as QueryGameBase['users'][string];
}

function makeGame(users: Record<string, ReturnType<typeof user>>, overrides: Partial<QueryGameBase> = {}): QueryGameBase {
  return {
    gameCode: 'G1',
    roomName: 'r',
    hostUsername: Object.keys(users)[0] ?? null,
    language: 'en' as QueryGameBase['language'],
    gameState: 'waiting',
    isRanked: false,
    isPrivate: false,
    createdAt: Date.now(),
    timerSeconds: 180,
    lastActivity: Date.now(),
    users,
    spectators: {},
    playerScores: {},
    letterGrid: null,
    tournamentId: null,
    ...overrides,
  };
}

describe('isRoomEmpty', () => {
  it('returns true for null game', () => {
    expect(isRoomEmpty(null)).toBe(true);
  });

  it('returns true when no users', () => {
    expect(isRoomEmpty(makeGame({}))).toBe(true);
  });

  it('returns false when an active human user exists', () => {
    expect(isRoomEmpty(makeGame({ a: user() }))).toBe(false);
  });

  it('returns true when only bots remain', () => {
    expect(isRoomEmpty(makeGame({ b: user({ isBot: true }) }))).toBe(true);
  });

  it('returns true when sole human user is disconnected (no grace)', () => {
    expect(isRoomEmpty(makeGame({ a: user({ disconnected: true, disconnectedAt: Date.now() }) }))).toBe(true);
  });

  // Grace-window awareness — protects backgrounded host from periodic empty-room sweep.
  describe('with gracePeriodMs', () => {
    it('returns false when sole user disconnected within grace window', () => {
      const game = makeGame({ a: user({ disconnected: true, disconnectedAt: Date.now() - 30_000 }) });
      expect(isRoomEmpty(game, { gracePeriodMs: 5 * 60_000 })).toBe(false);
    });

    it('returns true when sole user disconnected before grace window', () => {
      const game = makeGame({ a: user({ disconnected: true, disconnectedAt: Date.now() - 10 * 60_000 }) });
      expect(isRoomEmpty(game, { gracePeriodMs: 5 * 60_000 })).toBe(true);
    });

    it('returns true when disconnectedAt missing (legacy data)', () => {
      const game = makeGame({ a: user({ disconnected: true }) });
      expect(isRoomEmpty(game, { gracePeriodMs: 5 * 60_000 })).toBe(true);
    });

    it('ignores bot grace timestamps', () => {
      const game = makeGame({ b: user({ isBot: true, disconnected: true, disconnectedAt: Date.now() }) });
      expect(isRoomEmpty(game, { gracePeriodMs: 5 * 60_000 })).toBe(true);
    });
  });
});

describe('getEmptyRooms', () => {
  it('skips room whose host disconnected within grace window', () => {
    const games = {
      G1: makeGame({ Host: user({ isHost: true, disconnected: true, disconnectedAt: Date.now() - 30_000 }) }),
    };
    expect(getEmptyRooms(games, { gracePeriodMs: 5 * 60_000 })).toEqual([]);
  });

  it('returns rooms whose users disconnected before grace window', () => {
    const games = {
      G1: makeGame({ Host: user({ isHost: true, disconnected: true, disconnectedAt: Date.now() - 10 * 60_000 }) }),
    };
    expect(getEmptyRooms(games, { gracePeriodMs: 5 * 60_000 })).toEqual(['G1']);
  });

  it('default (no opts) preserves existing semantics — disconnected users count as empty', () => {
    const games = {
      G1: makeGame({ Host: user({ isHost: true, disconnected: true, disconnectedAt: Date.now() }) }),
    };
    expect(getEmptyRooms(games)).toEqual(['G1']);
  });
});
