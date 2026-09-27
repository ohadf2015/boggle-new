/**
 * A whole class joins in the same second. Every roster mutator is a
 * GET → mutate → SETEX of one JSON blob, so without serialisation the last
 * writer wins and earlier joins vanish from the teacher's live count.
 */
import { vi, type Mock } from 'vitest';
import {
  addPlayerToClassroomGame,
  updateClassroomGameStatus,
  getClassroomGame,
} from '../classroomGameManager';
import { getRedisClient } from '../../redisClient';

vi.mock('../../redisClient');
vi.mock('../../utils/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// A tiny async in-memory Redis: every call yields to the event loop, like the real client.
const store = new Map<string, string>();
const tick = () => new Promise((r) => setTimeout(r, 0));
const fakeRedis = {
  get: vi.fn(async (k: string) => { await tick(); return store.get(k) ?? null; }),
  setex: vi.fn(async (k: string, _ttl: number, v: string) => { await tick(); store.set(k, v); return 'OK'; }),
  sadd: vi.fn(async () => 1),
  srem: vi.fn(async () => 1),
  del: vi.fn(async () => 1),
  smembers: vi.fn(async () => []),
};

beforeAll(() => {
  (getRedisClient as Mock).mockReturnValue(fakeRedis);
});

beforeEach(() => {
  store.clear();
  store.set('classroom_game:RACE01', JSON.stringify({
    gameCode: 'RACE01', classroomId: 'c1', teacherId: 't1', teacherName: 'T',
    lessonIds: [], lessonNames: [], vocabularyWords: [], settings: {},
    players: [], createdAt: 'now', status: 'waiting',
  }));
});

describe('classroom game roster under a join storm', () => {
  it('keeps every student when 25 join at once', async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        addPlayerToClassroomGame('RACE01', { userId: `s${i}`, username: `S${i}`, socketId: `sock${i}` } as never),
      ),
    );
    const game = await getClassroomGame('RACE01');
    expect(game?.players).toHaveLength(25);
  });

  it('a late join does not revert the teacher starting the game', async () => {
    await Promise.all([
      addPlayerToClassroomGame('RACE01', { userId: 's1', username: 'S1', socketId: 'x' } as never),
      updateClassroomGameStatus('RACE01', 'playing'),
    ]);
    const game = await getClassroomGame('RACE01');
    expect(game?.status).toBe('playing');
    expect(game?.players).toHaveLength(1);
  });
});
