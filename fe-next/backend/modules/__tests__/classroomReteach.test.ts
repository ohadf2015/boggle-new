import { vi } from 'vitest';

const { mockSetex, mockGetClassroomGame } = vi.hoisted(() => ({
  mockSetex: vi.fn(),
  mockGetClassroomGame: vi.fn(),
}));

vi.mock('../../redisClient', () => ({
  getRedisClient: () => ({ setex: mockSetex }),
}));
vi.mock('../classroomGameManager', () => ({
  CLASSROOM_GAME_TTL: 14400,
  getClassroomGame: mockGetClassroomGame,
  withClassroomGameLock: (_code: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { setClassroomReteachWords } from '../classroomReteach';

const GAME = {
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  teacherName: 'Ms K',
  lessonIds: ['lesson-1'],
  lessonNames: ['Cells'],
  vocabularyWords: ['Osmosis', 'enzyme', 'membrane', 'nucleus'],
  players: [{ userId: 'u1', username: 'Ada', socketId: 's1' }],
  status: 'finished',
  createdAt: '2026-10-21T10:00:00Z',
  settings: { gameMode: 'classic', timerMinutes: 3, targetWord: 'nucleus' },
};

const written = () => JSON.parse(mockSetex.mock.calls[0][2] as string);

describe('setClassroomReteachWords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
  });

  it('given the words the class missed, when the reteach is applied, then the next round deals and grades only those words', async () => {
    const applied = await setClassroomReteachWords('ABC123', ['enzyme', 'membrane']);
    expect(applied).toEqual(['enzyme', 'membrane']);
    expect(written().vocabularyWords).toEqual(['enzyme', 'membrane']);
  });

  it('given a word that was never in the lesson, when it arrives, then the server drops it (the client cannot inject vocabulary)', async () => {
    const applied = await setClassroomReteachWords('ABC123', ['enzyme', 'pizza']);
    expect(applied).toEqual(['enzyme']);
  });

  it('given different casing and repeats, when applied, then the lesson keeps the teacher’s own spelling once', async () => {
    const applied = await setClassroomReteachWords('ABC123', ['OSMOSIS', 'osmosis']);
    expect(applied).toEqual(['Osmosis']);
  });

  it('given a pinned target word that is not being retaught, when applied, then the pin is dropped so the game picks from the reteach words', async () => {
    await setClassroomReteachWords('ABC123', ['enzyme']);
    expect(written().settings.targetWord).toBeUndefined();
    expect(written().settings.timerMinutes).toBe(3);
  });

  it('given a pinned target that IS being retaught, when applied, then the pin stays', async () => {
    await setClassroomReteachWords('ABC123', ['nucleus', 'enzyme']);
    expect(written().settings.targetWord).toBe('nucleus');
  });

  it('given the reteach, when written, then the record keeps its key, TTL and every other field', async () => {
    await setClassroomReteachWords('ABC123', ['enzyme']);
    const [key, ttl] = mockSetex.mock.calls[0];
    expect(key).toBe('classroom_game:ABC123');
    expect(ttl).toBe(14400);
    expect(written()).toMatchObject({ gameCode: 'ABC123', lessonIds: ['lesson-1'], players: GAME.players, status: 'finished' });
  });

  it('given nothing left to reteach, when applied, then nothing is written and the caller hears null', async () => {
    expect(await setClassroomReteachWords('ABC123', ['pizza'])).toBeNull();
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it('given an unknown game, when applied, then null', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    expect(await setClassroomReteachWords('ABC123', ['enzyme'])).toBeNull();
  });
});
