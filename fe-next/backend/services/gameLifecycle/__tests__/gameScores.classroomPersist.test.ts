/**
 * A teacher-hosted room ends through the ordinary multiplayer path
 * (calculateAndBroadcastFinalScores). The classroom persistence
 * (practice_sessions, student_lesson_progress, XP, the `classroomGameEnded`
 * reward event) lived only behind two socket events NO client ever emitted —
 * so a real class of five played on 2026-09-04 and nothing was recorded.
 * The server's own end-of-game path must persist, with no client cooperation.
 */

vi.mock('../../../modules/gameStateManager', () => ({ getGame: vi.fn() }));
vi.mock('../../../dictionary', () => ({ isDictionaryWord: vi.fn().mockReturnValue(true) }));
vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn().mockReturnValue(false),
  isWordValidForScoring: vi.fn().mockReturnValue(false),
}));
vi.mock('../../../modules/achievementManager', () => ({ awardFinalAchievements: vi.fn(), ACHIEVEMENT_ICONS: {} }));
vi.mock('../../../modules/playerTitlesManager', () => ({ calculatePlayerTitles: vi.fn().mockReturnValue({}) }));
vi.mock('../../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), getGameRoom: vi.fn().mockReturnValue('room:CLS') }));
vi.mock('../../../modules/supabaseServer', () => ({ isSupabaseConfigured: vi.fn().mockReturnValue(false) }));
vi.mock('../../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../handlers/classroomGamePersistence', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../handlers/classroomGamePersistence')>();
  return { ...real, persistClassroomGameScores: vi.fn().mockResolvedValue([{ userId: 'u-alice', xpEarned: 12, lessonIds: ['l1'] }]) };
});

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { getClassroomGame, updateClassroomGameStatus } from '../../../modules/classroomGameManager';
import { persistClassroomGameScores } from '../../../handlers/classroomGamePersistence';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const mockGetGame = getGame as Mock;
const mockGetClassroomGame = getClassroomGame as Mock;
const mockPersist = persistClassroomGameScores as Mock;

function ioMock() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as any, to, emit };
}

function finishedGame() {
  return {
    gameState: 'finished', gameMode: 'classic', language: 'en', hostUsername: 'teacher',
    users: {
      teacher: { isBot: false, isHost: true, authUserId: 'u-teacher' },
      alice: { isBot: false, authUserId: 'u-alice' },
      bot1: { isBot: true },
    },
    playerWords: { teacher: [], alice: ['hello'], bot1: ['world'] },
    playerWordDetails: { teacher: [], alice: [{ word: 'hello', score: 50, validated: true }], bot1: [{ word: 'world', score: 50, validated: true }] },
    playerScores: { teacher: 0, alice: 0, bot1: 0 },
    playerAchievements: {}, letterGrid: [['A']], gameSessionId: 'sess-1', isClassroom: true,
  };
}

const classroomGame = {
  gameCode: 'CLS', classroomId: 'c1', teacherId: 'u-teacher', teacherName: 'Ms T',
  lessonIds: ['l1'], lessonNames: ['Unit 3'], vocabularyWords: ['hello', 'world'],
  players: [{ userId: 'u-alice', username: 'alice' }], status: 'playing', settings: { gameMode: 'classic' },
};

describe('calculateAndBroadcastFinalScores — classroom persistence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists every student and emits classroomGameEnded with rewards for a classroom room', async () => {
    mockGetGame.mockReturnValue(finishedGame());
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    const { io, to, emit } = ioMock();

    await calculateAndBroadcastFinalScores(io, 'CLS');

    expect(updateClassroomGameStatus).toHaveBeenCalledWith('CLS', 'finished');
    expect(mockPersist).toHaveBeenCalledTimes(1);
    const [gameArg, scores] = mockPersist.mock.calls[0];
    expect(gameArg).toBe(classroomGame);
    // The student's validated words reach persistence; bots and the teacher-less-auth rows do not leak.
    expect(scores).toEqual(expect.arrayContaining([expect.objectContaining({ userId: 'u-alice', wordsFound: ['hello'] })]));
    expect(scores.some((s: any) => s.userId === undefined)).toBe(false);
    expect(to).toHaveBeenCalledWith('classroom:c1');
    expect(emit).toHaveBeenCalledWith('classroomGameEnded', { gameCode: 'CLS', rewards: [{ userId: 'u-alice', xpEarned: 12, lessonIds: ['l1'] }] });
  });

  it('does nothing classroom-related for an ordinary room', async () => {
    mockGetGame.mockReturnValue({ ...finishedGame(), isClassroom: false });
    mockGetClassroomGame.mockResolvedValue(null);
    const { io, to } = ioMock();

    await calculateAndBroadcastFinalScores(io, 'CLS');

    expect(mockPersist).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });

  it('a persistence failure is logged, and the results broadcast still happened', async () => {
    mockGetGame.mockReturnValue(finishedGame());
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    mockPersist.mockRejectedValueOnce(new Error('db down'));
    const { io } = ioMock();
    const { broadcastToRoom } = await import('../../../utils/socketHelpers');

    await expect(calculateAndBroadcastFinalScores(io, 'CLS')).resolves.not.toThrow();
    expect((broadcastToRoom as Mock).mock.calls.some((c: any[]) => c[2] === 'validatedScores')).toBe(true);
  });
});
