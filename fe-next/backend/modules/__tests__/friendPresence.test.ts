import { describe, it, expect } from 'vitest';
import { presenceForGame, collectFriendPresence } from '../friendPresence';

type G = Parameters<typeof presenceForGame>[0];

const game = (over: Partial<NonNullable<G>> = {}): G => ({
  gameState: 'waiting',
  isPrivate: false,
  isClassroom: false,
  isRanked: false,
  tournamentId: null,
  allowLateJoin: true,
  users: { bea: {} },
  ...over,
});

describe('presenceForGame', () => {
  it('Given a public lobby, Then the friend is in_lobby with the code', () => {
    expect(presenceForGame(game(), 'bea', 'ABCD')).toEqual({ status: 'in_lobby', gameCode: 'ABCD' });
  });

  it('Given a classroom room, Then nothing is revealed', () => {
    expect(presenceForGame(game({ isClassroom: true }), 'bea', 'ABCD')).toEqual({ status: null });
  });

  it('Given a private room, Then the status is private with no code', () => {
    expect(presenceForGame(game({ isPrivate: true }), 'bea', 'ABCD')).toEqual({ status: 'private' });
  });

  it('Given a public game in progress that allows late join, Then playing with the code', () => {
    expect(presenceForGame(game({ gameState: 'in-progress' }), 'bea', 'ABCD')).toEqual({ status: 'playing', gameCode: 'ABCD' });
  });

  it('Given a game in progress with late join off, Then playing without a code', () => {
    expect(presenceForGame(game({ gameState: 'in-progress', allowLateJoin: false }), 'bea', 'ABCD')).toEqual({ status: 'playing' });
  });

  it('Given a ranked or tournament room, Then never a joinable code', () => {
    expect(presenceForGame(game({ isRanked: true }), 'bea', 'ABCD')).toEqual({ status: 'in_lobby' });
    expect(presenceForGame(game({ tournamentId: 't1', gameState: 'in-progress' }), 'bea', 'ABCD')).toEqual({ status: 'playing' });
  });

  it('Given a stale connection whose seat is gone, Then no presence', () => {
    expect(presenceForGame(game({ users: {} }), 'bea', 'ABCD')).toEqual({ status: null });
    expect(presenceForGame(null, 'bea', 'ABCD')).toEqual({ status: null });
  });
});

describe('collectFriendPresence', () => {
  const conns: Record<string, { gameCode: string; username: string }> = {
    friend1: { gameCode: 'LOBBY', username: 'bea' },
    friend2: { gameCode: 'CLASS', username: 'kid' },
    stranger: { gameCode: 'LOBBY', username: 'eve' },
  };
  const games: Record<string, G> = {
    LOBBY: game({ users: { bea: {}, eve: {} } }),
    CLASS: game({ isClassroom: true, users: { kid: {} } }),
  };
  const deps = {
    connection: (id: string) => conns[id] ?? null,
    game: (code: string) => games[code] ?? null,
  };

  it('Given accepted friends, Then only those ids come back, classroom hidden, offline null', () => {
    expect(collectFriendPresence(['friend1', 'friend2', 'friend3'], deps)).toEqual([
      { userId: 'friend1', status: 'in_lobby', gameCode: 'LOBBY' },
      { userId: 'friend2', status: null },
      { userId: 'friend3', status: null },
    ]);
  });
});

describe('process-wide lookups for the Next bundle', () => {
  it('Given a socket-side seat, Then the shared globals expose the connection and the game', async () => {
    const userManager = await import('../userManager');
    const gsm = await import('../gameStateManager');
    userManager.setAuthUserConnection('auth-1', { gameCode: 'GLOB', username: 'Bea', socketId: 's', isHost: false });
    const shared = (globalThis as Record<string, unknown>).__lcAuthUserConnections as Map<string, { gameCode: string }>;
    expect(shared.get('auth-1')?.gameCode).toBe('GLOB');
    const lookup = (globalThis as Record<string, unknown>).__lcGameLookup as (code: string) => unknown;
    expect(typeof lookup).toBe('function');
    expect(lookup('NOPE')).toBeNull();
    expect(lookup).toBe(gsm.getGame);
    userManager.removeAuthUserConnection('auth-1');
  });
});
