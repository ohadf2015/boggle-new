import { describe, it, expect } from 'vitest';
import { getActiveRooms, type QueryGameBase } from '../gameQueryManager';
import { MAX_PLAYERS_PER_ROOM } from '../../utils/consts';
import type { GameUser } from '@/shared/types/game';

function user(username: string, extra: Partial<GameUser> = {}): GameUser {
  return { username, socketId: `s-${username}`, ...extra } as GameUser;
}

function game(gameCode: string, overrides: Partial<QueryGameBase> & { isClassroom?: boolean } = {}): QueryGameBase {
  return {
    gameCode,
    roomName: `${gameCode} room`,
    hostUsername: 'host',
    language: 'en',
    gameState: 'waiting',
    isRanked: false,
    isPrivate: false,
    createdAt: 1,
    timerSeconds: 120,
    lastActivity: 1,
    users: { host: user('host', { isHost: true }) },
    spectators: {},
    playerScores: {},
    letterGrid: null,
    tournamentId: null,
    ...overrides,
  };
}

const codes = (games: QueryGameBase[]) =>
  getActiveRooms(Object.fromEntries(games.map((g) => [g.gameCode, g]))).map((r) => r.gameCode);

describe('getActiveRooms (the public room list every lobby socket receives)', () => {
  it('Given a public room with a human, When listed, Then it carries its board language, host and seats', () => {
    const [room] = getActiveRooms({ HE1: game('HE1', { language: 'he', hostUsername: 'dana' }) });
    expect(room).toMatchObject({ gameCode: 'HE1', language: 'he', hostUsername: 'dana', playerCount: 1, maxPlayers: MAX_PLAYERS_PER_ROOM });
  });

  it('Given a private room, When listed, Then it is left out', () => {
    expect(codes([game('PUB'), game('PRIV', { isPrivate: true })])).toEqual(['PUB']);
  });

  it('Given a classroom room that is somehow not private, When listed, Then it is still left out', () => {
    expect(codes([game('PUB'), game('CLASS', { isClassroom: true, isPrivate: false })])).toEqual(['PUB']);
  });

  it('Given a room with only bots or disconnected humans, When listed, Then it is left out', () => {
    const botsOnly = game('BOTS', { users: { b: user('b', { isBot: true }) } });
    const gone = game('GONE', { users: { h: user('h', { disconnected: true }) } });
    expect(codes([game('PUB'), botsOnly, gone])).toEqual(['PUB']);
  });

  it('Given bots seated next to a human, When listed, Then only the human counts toward seats', () => {
    const mixed = game('MIX', { users: { host: user('host'), b: user('b', { isBot: true }) } });
    expect(getActiveRooms({ MIX: mixed })[0].playerCount).toBe(1);
  });
});
