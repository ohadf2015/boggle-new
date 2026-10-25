import { vi } from 'vitest';

const { mockRedis, store, ended } = vi.hoisted(() => {
  const store = new Map<string, string>();
  return {
    store,
    ended: vi.fn(async () => undefined),
    mockRedis: {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      setex: vi.fn(async (k: string, _ttl: number, v: string) => { store.set(k, v); }),
      srem: vi.fn(async () => 1),
    },
  };
});

vi.mock('../../redisClient', () => ({ getRedisClient: () => mockRedis }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('../../utils/eduLiveEvents', () => ({ captureLiveGameEnded: ended }));

import { updateClassroomGameStatus } from '../classroomGameManager';

const CODE = 'END123';

beforeEach(() => {
  store.clear();
  ended.mockClear();
  store.set(`classroom_game:${CODE}`, JSON.stringify({
    gameCode: CODE, classroomId: 'c1', teacherId: 't1', players: [], settings: {}, status: 'playing',
    startedAt: '2026-10-07T12:00:00.000Z', createdAt: '2026-10-07T11:55:00.000Z',
  }));
});

describe('updateClassroomGameStatus — live game ended event', () => {
  it('Given a playing game, When it ends twice (teacher end + teardown), Then the ended event fires once', async () => {
    await updateClassroomGameStatus(CODE, 'ended');
    await updateClassroomGameStatus(CODE, 'ended');
    expect(ended).toHaveBeenCalledTimes(1);
    expect(ended.mock.calls[0][0]).toMatchObject({ gameCode: CODE, classroomId: 'c1' });
  });

  it('Given a round finishes, When status becomes finished, Then no ended event fires', async () => {
    await updateClassroomGameStatus(CODE, 'finished');
    expect(ended).not.toHaveBeenCalled();
  });
});
