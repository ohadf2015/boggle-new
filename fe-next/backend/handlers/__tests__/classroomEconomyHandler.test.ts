import { describe, it, expect, vi, beforeEach } from 'vitest';

const grant = vi.fn();
const classroomGame = { value: null as unknown };
const lockerRows = new Map<string, unknown[]>();
const gameState = { value: { gameSessionId: 'sess-7' } as unknown };
const applyCorrect = vi.fn();
const buyPowerUpFor = vi.fn();
const handlers: Record<string, (data: unknown) => Promise<void>> = {};

vi.mock('../../modules/classroomEconomyChest', () => ({
  grantRoundChest: (input: unknown) => grant(input),
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: async () => classroomGame.value,
}));
vi.mock('../../modules/classroomEconomyService', () => ({
  applyCorrectWord: (input: unknown) => applyCorrect(input),
  applyWrongWord: vi.fn(),
  buildBoard: vi.fn(),
  buyPowerUpFor: (input: unknown) => buyPowerUpFor(input),
  toSnapshot: vi.fn(),
  spendHintFor: vi.fn(),
  roundSummaryFor: async () => ({ roundCash: 12, rank: 2, size: 3 }),
}));
vi.mock('../../modules/classroomEconomyLocker', () => ({
  readLocker: async (userId: string) => lockerRows.get(userId) ?? [],
}));
vi.mock('../../modules/classroomEconomyStore', () => ({
  loadConfig: vi.fn(),
  readEconomy: vi.fn(),
  saveEconomyConfig: vi.fn(),
}));
vi.mock('../../redisClient', () => ({
  getGameState: async () => gameState.value,
  getRedisClient: () => null,
}));
vi.mock('../classroomSocketAuth.js', () => ({ getAuthUserId: () => 'u1' }));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: () => true }));

import {
  economyOnWordAccepted,
  registerClassroomEconomyHandlers,
  roundIdOf,
} from '../classroomEconomyHandler';

function fakeIo() {
  const emits: Array<{ room: string; event: string; data: unknown }> = [];
  return {
    emits,
    io: {
      to: (room: string) => ({
        emit: (event: string, data: unknown) => emits.push({ room, event, data }),
      }),
    } as never,
  };
}

beforeEach(() => {
  buyPowerUpFor.mockReset();
  grant.mockReset();
  applyCorrect.mockReset();
  classroomGame.value = null;
  gameState.value = { gameSessionId: 'sess-7' };
});

describe('classroomEconomy:requestLocker', () => {
  it('Given a student with chests, Then the locker goes back only to that socket', async () => {
    lockerRows.set('u1', [{ gameCode: 'ABC', roundId: '3', rarity: 'rare', xp: 25, itemId: 'tile-neon', createdAt: 'x' }]);
    const socket = { id: 's1', emit: (event: string, data: unknown) => emitted.push({ event, data }), on: (ev: string, fn: (d: unknown) => Promise<void>) => { handlers[ev] = fn; } };
    const emitted: Array<{ event: string; data: unknown }> = [];
    socket.emit = (event: string, data: unknown) => emitted.push({ event, data });
    registerClassroomEconomyHandlers({} as never, socket as never);
    await handlers['classroomEconomy:requestLocker']({});
    expect(emitted).toEqual([{ event: 'classroomEconomy:locker', data: [expect.objectContaining({ rarity: 'rare' })] }]);
    lockerRows.clear();
  });
});

describe('classroomEconomy:requestReward', () => {
  const reveal = { gameCode: 'ABC', roundId: '7', userId: 'u1', rarity: 'common', xp: 10, itemId: 'tile-default', roundCash: 12, rank: 2, size: 3 };

  function handlerSocket() {
    const emitted: Array<{ event: string; data: unknown }> = [];
    const socket = { id: 's1', emit: (event: string, data: unknown) => emitted.push({ event, data }), on: (ev: string, fn: (d: unknown) => Promise<void>) => { handlers[ev] = fn; } };
    registerClassroomEconomyHandlers({} as never, socket as never);
    return { socket, emitted };
  }

  it('Given the round has ended, Then the student gets their reveal back on their own socket', async () => {
    gameState.value = { gameSessionId: 7, cachedResultsPayload: { gameSessionId: 7 } };
    classroomGame.value = { players: [{ userId: 'u1' }], teacherId: 't' };
    grant.mockResolvedValue(reveal);
    const { emitted } = handlerSocket();
    await handlers['classroomEconomy:requestReward']({ gameCode: 'ABC', roundId: '7' });
    expect(grant).toHaveBeenCalledWith(expect.objectContaining({ gameCode: 'ABC', roundId: '7', userId: 'u1', summary: { roundCash: 12, rank: 2, size: 3 } }));
    expect(emitted).toEqual([{ event: 'classroomEconomy:reward', data: reveal }]);
  });

  it('Given the round is still running, Then no chest is rolled', async () => {
    gameState.value = { gameSessionId: 7, cachedResultsPayload: null };
    classroomGame.value = { players: [{ userId: 'u1' }], teacherId: 't' };
    const { emitted } = handlerSocket();
    await handlers['classroomEconomy:requestReward']({ gameCode: 'ABC', roundId: '7' });
    expect(grant).not.toHaveBeenCalled();
    expect(emitted).toEqual([{ event: 'classroomEconomy:reward', data: null }]);
  });

  it('Given a socket that is not a seated player, Then no chest is rolled', async () => {
    gameState.value = { gameSessionId: 7, cachedResultsPayload: { gameSessionId: 7 } };
    classroomGame.value = { players: [{ userId: 'someone-else' }], teacherId: 't' };
    const { emitted } = handlerSocket();
    await handlers['classroomEconomy:requestReward']({ gameCode: 'ABC', roundId: '7' });
    expect(grant).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });
});

describe('economyOnWordAccepted', () => {
  it('Given a normal MP room (no classroom record), Then nothing is awarded', async () => {
    const socket = { emit: vi.fn() };
    await economyOnWordAccepted(socket as never, { gameCode: 'X', roundId: 'r', userId: 'u1', word: 'cat', fromLesson: false });
    expect(applyCorrect).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('Given a classroom room, Then the word is applied and the snapshot goes only to that socket', async () => {
    classroomGame.value = { gameCode: 'ABC', players: [] };
    applyCorrect.mockResolvedValue({ cash: 2 });
    const socket = { emit: vi.fn() };
    await economyOnWordAccepted(socket as never, { gameCode: 'ABC', roundId: 'r', userId: 'u1', word: 'cats', fromLesson: true });
    expect(applyCorrect).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', wordLength: 4, fromLesson: true }));
    expect(socket.emit).toHaveBeenCalledWith('classroomEconomy:state', { cash: 2 });
  });
});

describe('classroomEconomy:buyPowerUp targeting', () => {
  it('Given a payload naming another student, Then the power-up is bought for the buyer only', async () => {
    classroomGame.value = { gameCode: 'ABC', players: [{ userId: 'u1' }, { userId: 'u2' }] };
    buyPowerUpFor.mockResolvedValue({ ok: true, snapshot: { cash: 0 } });
    const socket = {
      id: 's1',
      emit: vi.fn(),
      on: (event: string, fn: (data: unknown) => Promise<void>) => { handlers[event] = fn; },
    };
    registerClassroomEconomyHandlers({} as never, socket as never);
    await handlers['classroomEconomy:buyPowerUp']({
      gameCode: 'ABC', powerUpId: 'doubleCash', targetUserId: 'u2', userId: 'u2',
    });
    expect(buyPowerUpFor).toHaveBeenCalledTimes(1);
    const input = buyPowerUpFor.mock.calls[0][0] as Record<string, unknown>;
    expect(input.userId).toBe('u1');
    expect(input).not.toHaveProperty('targetUserId');
  });
});

describe('roundIdOf', () => {
  it('Given a game with a session id, Then it is used as the round id', () => {
    expect(roundIdOf({ gameSessionId: 42 }, 'ABC')).toBe('42');
  });

  it('Given no session id, Then the game code is used', () => {
    expect(roundIdOf({}, 'ABC')).toBe('ABC');
  });
});
