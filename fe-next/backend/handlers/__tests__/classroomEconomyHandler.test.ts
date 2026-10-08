import { describe, it, expect, vi, beforeEach } from 'vitest';

const grant = vi.fn();
const classroomGame = { value: null as unknown };
const applyCorrect = vi.fn();
const buyPowerUpFor = vi.fn();
const handlers: Record<string, (data: unknown) => Promise<void>> = {};

vi.mock('../../modules/classroomEconomyChest', () => ({
  grantEndOfGameChest: (input: unknown) => grant(input),
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
}));
vi.mock('../../modules/classroomEconomyStore', () => ({
  loadConfig: vi.fn(),
  readEconomy: vi.fn(),
  saveEconomyConfig: vi.fn(),
}));
vi.mock('../../redisClient', () => ({
  getGameState: async () => ({ gameSessionId: 'sess-7' }),
  getRedisClient: () => null,
}));
vi.mock('../classroomSocketAuth.js', () => ({ getAuthUserId: () => 'u1' }));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: () => true }));

import {
  economyGrantChests,
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
});

describe('economyGrantChests', () => {
  it('Given two students, Then each chest goes only to that student user room', async () => {
    grant.mockImplementation(async ({ userId }: { userId: string }) => ({
      gameCode: 'ABC', roundId: 'sess-7', userId, rarity: 'common', xp: 10, itemId: 'tile-default',
    }));
    const { io, emits } = fakeIo();
    await economyGrantChests(io, { gameCode: 'ABC', userIds: ['u1', 'u2'] });
    expect(emits.map((e) => e.room)).toEqual(['user:u1', 'user:u2']);
    expect(emits.every((e) => e.event === 'classroomEconomy:chest')).toBe(true);
  });

  it('Given a claim was refused, Then no reveal is emitted for that student', async () => {
    grant.mockResolvedValue(null);
    const { io, emits } = fakeIo();
    await economyGrantChests(io, { gameCode: 'ABC', userIds: ['u1'] });
    expect(emits).toHaveLength(0);
  });

  it('Given a live session, Then the chest is keyed by that session id', async () => {
    grant.mockResolvedValue(null);
    const { io } = fakeIo();
    await economyGrantChests(io, { gameCode: 'ABC', userIds: ['u1'] });
    expect(grant).toHaveBeenCalledWith({ gameCode: 'ABC', roundId: 'sess-7', userId: 'u1' });
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
