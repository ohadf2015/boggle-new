/**
 * The in-place mode write, on its own.
 *
 * The handler test mocks this module, so without these the load-bearing detail
 * — that the record is written back under the SAME `classroom_game:<code>` key,
 * with every other field intact — would be asserted nowhere. A switch that
 * dropped `lessonIds` or `players` would still emit a cheerful ack and then
 * start a quiz with no words in it.
 */
import { vi } from 'vitest';

const { mockSetex, mockGetClassroomGame } = vi.hoisted(() => ({
  mockSetex: vi.fn(),
  mockGetClassroomGame: vi.fn(),
}));

vi.mock('../../redisClient', () => ({
  getRedisClient: () => ({ setex: mockSetex, get: vi.fn(), srem: vi.fn() }),
}));
vi.mock('../classroomGameManager', () => ({
  CLASSROOM_GAME_TTL: 14400,
  getClassroomGame: mockGetClassroomGame,
  withClassroomGameLock: (_code: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { setClassroomGameMode, setClassroomPressureSettings } from '../classroomGameSettings';

const GAME = {
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  lessonIds: ['lesson-1'],
  vocabularyWords: ['osmosis', 'enzyme'],
  players: [{ userId: 'u1', username: 'Ada', socketId: 's1' }],
  status: 'waiting',
  settings: { gameMode: 'classic', timerMinutes: 3, vocabQuizSeconds: 20 },
};

describe('setClassroomGameMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
  });

  it('writes the new mode back under the same key and keeps everything else', async () => {
    const ok = await setClassroomGameMode('ABC123', 'vocab-quiz');

    expect(ok).toBe(true);
    const [key, ttl, body] = mockSetex.mock.calls[0];
    expect(key).toBe('classroom_game:ABC123');
    expect(ttl).toBe(14400);
    const written = JSON.parse(body as string);
    expect(written.gameCode).toBe('ABC123');
    expect(written.settings.gameMode).toBe('vocab-quiz');
    // The quiz round shape and the lesson survive the switch.
    expect(written.settings.vocabQuizSeconds).toBe(20);
    expect(written.lessonIds).toEqual(['lesson-1']);
    expect(written.players).toHaveLength(1);
  });

  it('reports failure instead of pretending, when the room is gone', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    expect(await setClassroomGameMode('ABC123', 'blast')).toBe(false);
    expect(mockSetex).not.toHaveBeenCalled();
  });
});

describe('setClassroomPressureSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue(JSON.parse(JSON.stringify(GAME)));
  });

  it('writes the dials under settings.pressure and keeps every other field', async () => {
    const ok = await setClassroomPressureSettings('ABC123', {
      leaderboard: 'hidden',
      timer: 'gentle',
      speedScoring: false,
    });

    expect(ok).toBe(true);
    const [key, ttl, body] = mockSetex.mock.calls[0];
    expect(key).toBe('classroom_game:ABC123');
    expect(ttl).toBe(14400);
    const written = JSON.parse(body as string);
    expect(written.settings.pressure).toEqual({
      leaderboard: 'hidden',
      timer: 'gentle',
      speedScoring: false,
    });
    // The mode, the quiz round shape and the roster survive the write.
    expect(written.settings.gameMode).toBe('classic');
    expect(written.settings.vocabQuizSeconds).toBe(20);
    expect(written.players).toHaveLength(1);
  });

  it('normalizes a partial or garbage payload rather than storing it raw', async () => {
    // The server is the source of truth for what the dials MEAN: a hand-rolled
    // socket payload with one valid field must land as that field plus the
    // loud defaults, never as client-supplied junk a renderer trips over.
    const ok = await setClassroomPressureSettings('ABC123', { timer: 'off', leaderboard: 'bogus' });

    expect(ok).toBe(true);
    const written = JSON.parse(mockSetex.mock.calls[0][2] as string);
    expect(written.settings.pressure).toEqual({
      leaderboard: 'full',
      timer: 'off',
      speedScoring: true,
    });
  });

  it('reports failure instead of pretending, when the room is gone', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    expect(await setClassroomPressureSettings('ABC123', { timer: 'off' })).toBe(false);
    expect(mockSetex).not.toHaveBeenCalled();
  });
});
