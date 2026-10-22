import { vi, type Mock } from 'vitest';

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: { smembers: vi.fn(), get: vi.fn(), srem: vi.fn(), setex: vi.fn(), sadd: vi.fn(), del: vi.fn() },
}));

vi.mock('../../redisClient', () => ({ getRedisClient: () => mockRedis }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { beginClassroomRound, reopenClassroomGameForRound } from '../classroomGameManager';
import { setClassroomReteachWords } from '../classroomReteach';

const CODE = 'R438D5';
const LESSON = ['osmosis', 'enzyme', 'membrane'];

function record(extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    gameCode: CODE,
    classroomId: 'c1',
    teacherId: 't1',
    teacherName: 'Ms K',
    lessonIds: ['l1'],
    lessonNames: ['Cells'],
    vocabularyWords: LESSON,
    settings: { targetWord: 'osmosis' },
    players: [],
    createdAt: '2026-10-22T08:00:00.000Z',
    status: 'finished',
    ...extra,
  });
}

const narrowed = (pending: boolean) =>
  record({ vocabularyWords: ['enzyme'], settings: {}, reteach: { fullVocabularyWords: LESSON, fullTargetWord: 'osmosis', pending } });

const writtenRecord = () => JSON.parse((mockRedis.setex as Mock).mock.calls[0][2]);

describe('round start after a replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.sadd.mockResolvedValue(1);
    mockRedis.del.mockResolvedValue(1);
  });

  it('given a replay was just set, when its round starts, then the board is dealt from the narrowed words', async () => {
    mockRedis.get.mockResolvedValue(narrowed(true));
    const game = await beginClassroomRound(CODE);
    expect(game?.vocabularyWords).toEqual(['enzyme']);
    expect(writtenRecord().reteach.pending).toBe(false);
  });

  it('given the replay round was played, when Play again or the next mode starts, then the full lesson is dealt and saved back', async () => {
    mockRedis.get.mockResolvedValue(narrowed(false));
    const game = await beginClassroomRound(CODE);
    expect(game?.vocabularyWords).toEqual(LESSON);
    expect(game?.settings.targetWord).toBe('osmosis');
    expect(writtenRecord().vocabularyWords).toEqual(LESSON);
    expect(writtenRecord().reteach).toBeUndefined();
  });

  it('given a quiz round starts after the replay round, when the room reopens, then the full lesson comes back too', async () => {
    mockRedis.get.mockResolvedValue(narrowed(false));
    await reopenClassroomGameForRound(CODE);
    expect(writtenRecord().vocabularyWords).toEqual(LESSON);
  });

  it('given a record from before replays kept the full list, when a round starts, then its words are untouched', async () => {
    mockRedis.get.mockResolvedValue(record());
    const game = await beginClassroomRound(CODE);
    expect(game?.vocabularyWords).toEqual(LESSON);
    expect(writtenRecord().reteach).toBeUndefined();
  });

  it('given a duplicate start while the replay is already playing, when it arrives, then the replay is not used up', async () => {
    mockRedis.get.mockResolvedValue(record({ ...JSON.parse(narrowed(false)), status: 'playing' }));
    const game = await beginClassroomRound(CODE);
    expect(game?.vocabularyWords).toEqual(['enzyme']);
    expect(mockRedis.setex).not.toHaveBeenCalled();
  });

  it('given a real narrow, replay round and round end, when the next round starts, then the full lesson is back', async () => {
    let stored = record();
    mockRedis.get.mockImplementation(async () => stored);
    mockRedis.setex.mockImplementation(async (_key: string, _ttl: number, value: string) => {
      stored = value;
      return 'OK';
    });

    await setClassroomReteachWords(CODE, ['enzyme']);
    expect((await beginClassroomRound(CODE))?.vocabularyWords).toEqual(['enzyme']);
    stored = JSON.stringify({ ...JSON.parse(stored), status: 'finished' });

    const next = await beginClassroomRound(CODE);
    expect(next?.vocabularyWords).toEqual(LESSON);
    expect(next?.settings.targetWord).toBe('osmosis');
    expect(JSON.parse(stored).reteach).toBeUndefined();
  });
});

