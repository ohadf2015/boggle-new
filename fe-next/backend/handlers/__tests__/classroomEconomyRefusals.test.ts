import { describe, it, expect, vi, beforeEach } from 'vitest';

const warn = vi.fn();
const limit = { ok: true };
const seated = { value: true };
const auth = { userId: 'u1' as string | null };
const liveGame = { value: { gameSessionId: 'sess-7', gameState: 'active' } as Record<string, unknown> };
const finishedGame = { gameSessionId: 'sess-7', gameState: 'finished', cachedResultsPayload: { gameSessionId: 'sess-7' } };
const handlers: Record<string, (data: unknown) => Promise<void>> = {};

vi.mock('../../utils/logger.js', () => ({
  default: { warn: (...args: unknown[]) => warn(...args), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: () => limit.ok }));
vi.mock('../classroomSocketAuth.js', () => ({ getAuthUserId: () => auth.userId }));
vi.mock('../../redisClient', () => ({ getRedisClient: () => null, getGameState: async () => null }));
vi.mock('../../modules/gameStateManager', () => ({
  getGameAsync: async () => ({
    ...liveGame.value,
    users: seated.value ? { Ann: { authUserId: 'u1' } } : {},
  }),
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: async () => ({ classroomId: 'c1', teacherId: 't', players: [] }),
}));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  resolveClassroomRole: async () => ({ status: 'ok', role: 'student' }),
}));
vi.mock('../../modules/classroomEconomyService', () => ({
  applyCorrectWord: vi.fn(),
  applyWrongWord: vi.fn(),
  buildBoard: vi.fn(),
  buyPowerUpFor: vi.fn(async () => ({ ok: false, reason: 'insufficient_cash' })),
  roundSummaryFor: vi.fn(),
  toSnapshot: vi.fn(),
  spendHintFor: vi.fn(),
}));
vi.mock('../../modules/classroomEconomyStore', () => ({
  loadConfig: vi.fn(async () => ({ wrongAnswerCost: false, powerUps: true })),
  readEconomy: vi.fn(async () => null),
  saveEconomyConfig: vi.fn(),
}));
vi.mock('../../modules/classroomEconomyChest', () => ({ grantRoundChest: vi.fn() }));
vi.mock('../../modules/classroomEconomyLocker', () => ({ readLocker: vi.fn(async () => []) }));

import { registerClassroomEconomyHandlers } from '../classroomEconomyHandler';

function fakeSocket() {
  const emit = vi.fn();
  const socket = {
    id: 's1',
    emit,
    on: (event: string, fn: (data: unknown) => Promise<void>) => {
      handlers[event] = fn;
    },
  };
  registerClassroomEconomyHandlers({} as never, socket as never);
  return { emit };
}

beforeEach(() => {
  warn.mockReset();
  limit.ok = true;
  seated.value = true;
  auth.userId = 'u1';
  liveGame.value = { gameSessionId: 'sess-7', gameState: 'active' };
});

describe('classroom economy refusals are logged, never silent', () => {
  it('Given the socket is rate limited, When it asks for state, Then the refusal is logged', async () => {
    limit.ok = false;
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestState']({ gameCode: 'ABC' });
    expect(emit).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('rate_limited'));
  });

  it('Given the socket is not seated, When it asks for state, Then the refusal is logged', async () => {
    seated.value = false;
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestState']({ gameCode: 'ABC' });
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('not_seated'));
  });

  it('Given the socket is not seated, When it buys a power-up, Then the refusal is logged', async () => {
    seated.value = false;
    fakeSocket();
    await handlers['classroomEconomy:buyPowerUp']({ gameCode: 'ABC', powerUpId: 'hintReveal' });
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('not_seated'));
  });

  it('Given the student is not seated, When it asks for the round chest, Then the refusal is logged and the reply is a null reward', async () => {
    seated.value = false;
    liveGame.value = finishedGame;
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestReward']({ gameCode: 'ABC', roundId: 'sess-7' });
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('not_seated'));
    expect(emit).toHaveBeenCalledWith('classroomEconomy:reward', null);
  });

  it('Given the round is still live, When the student asks for the chest, Then it is refused with a null reply the client can retry on', async () => {
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestReward']({ gameCode: 'ABC', roundId: 'sess-7' });
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('round_not_over'));
    expect(emit).toHaveBeenCalledWith('classroomEconomy:reward', null);
  });

  it('Given no verified identity, When it asks for state, Then the student is told why instead of waiting forever', async () => {
    auth.userId = null;
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestState']({ gameCode: 'ABC' });
    expect(warn).toHaveBeenCalledWith('CLASSROOM_ECONOMY', expect.stringContaining('not_signed_in'));
    expect(emit).toHaveBeenCalledWith('classroomEconomy:error', { reason: 'not_signed_in' });
  });

  it('Given the student is not seated, When it asks for state, Then the student is told why', async () => {
    seated.value = false;
    const { emit } = fakeSocket();
    await handlers['classroomEconomy:requestState']({ gameCode: 'ABC' });
    expect(emit).toHaveBeenCalledWith('classroomEconomy:error', { reason: 'not_seated' });
  });
});
