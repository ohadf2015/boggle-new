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
  saveClassroomSessionScores: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../handlers/classroomGamePersistence', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../handlers/classroomGamePersistence')>();
  return { ...real, persistClassroomGameScores: vi.fn().mockResolvedValue([]) };
});

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { getClassroomGame } from '../../../modules/classroomGameManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const mockGetGame = getGame as Mock;
const mockGetClassroomGame = getClassroomGame as Mock;

function ioMock() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as any, to, emit };
}

const puzzle = { id: 'en-mini-001', slots: [{ answer: 'HELLO' }, { answer: 'WORLD' }, { answer: 'ATOM' }] };

function crosswordRound() {
  return {
    gameState: 'finished', gameMode: 'crossword', language: 'en', hostUsername: 'teacher',
    users: {
      teacher: { isBot: false, isHost: true, authUserId: 'u-teacher' },
      alice: { isBot: false, authUserId: 'u-alice' },
      bob: { isBot: false, authUserId: 'u-bob' },
    },
    playerWords: { teacher: [], alice: [], bob: [] },
    playerWordDetails: { teacher: [], alice: [], bob: [] },
    playerScores: { teacher: 0, alice: 300, bob: 120 },
    crosswordMpState: {
      players: ['alice', 'bob'],
      puzzle,
      progress: {
        alice: { percent: 100, solved: true, elapsedMs: 60000, score: 300 },
        bob: { percent: 40, solved: false, elapsedMs: 90000, score: 120 },
      },
      startedAt: 0,
    },
    playerAchievements: {}, letterGrid: [], gameSessionId: 'sess-cw', isClassroom: true,
  };
}

const classroomGame = {
  gameCode: 'CLS', classroomId: 'c1', teacherId: 'u-teacher', teacherName: 'Ms T',
  lessonIds: ['l1'], lessonNames: ['Unit 3'], vocabularyWords: ['hello', 'world', 'castle'],
  players: [{ userId: 'u-alice', username: 'alice' }, { userId: 'u-bob', username: 'bob' }],
  status: 'playing', settings: { gameMode: 'crossword' },
};

function summaryFromBroadcast() {
  const call = (broadcastToRoom as Mock).mock.calls.find((c: any[]) => c[2] === 'validatedScores');
  return call?.[3]?.classroomSummary;
}

describe('a crossword round in a classroom room', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ends on the classroom recap: the solved grid counts as found, lesson words off the grid are never placed', async () => {
    mockGetGame.mockReturnValue(crosswordRound());
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, 'CLS');

    const summary = summaryFromBroadcast();
    expect(summary).toBeDefined();
    expect(summary.podium[0]).toEqual(expect.objectContaining({ username: 'alice' }));
    const found = Object.fromEntries(summary.coverage.map((c: { word: string; foundBy: string[] }) => [c.word, c.foundBy]));
    expect(found.hello).toEqual(['alice']);
    expect(found.world).toEqual(['alice']);
    expect(summary.neverPlacedWords).toEqual(['castle']);
  });

  it('on a lesson-dealt grid, each solved clue counts as that lesson word found', async () => {
    const round = crosswordRound();
    round.crosswordMpState = {
      ...round.crosswordMpState,
      puzzle: { id: 'lesson-CLS', slots: [{ id: 'A1', answer: 'hello' }, { id: 'D2', answer: 'world' }] },
      lessonWordBySlot: { A1: 'hello', D2: 'world' },
      progress: {
        alice: { percent: 50, solved: false, elapsedMs: 60000, score: 0, solvedSlotIds: ['D2'] },
        bob: { percent: 0, solved: false, elapsedMs: 90000, score: 0 },
      },
    } as typeof round.crosswordMpState;
    mockGetGame.mockReturnValue(round);
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, 'CLS');

    const summary = summaryFromBroadcast();
    const found = Object.fromEntries(summary.coverage.map((c: { word: string; foundBy: string[] }) => [c.word, c.foundBy]));
    expect(found.world).toEqual(['alice']);
    expect(found.hello).toEqual([]);
    expect(summary.neverPlacedWords).toEqual(['castle']);
  });

  it('an arcade crossword room still ends without a classroom recap', async () => {
    mockGetGame.mockReturnValue({ ...crosswordRound(), isClassroom: false });
    mockGetClassroomGame.mockResolvedValue(null);
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, 'CLS');

    expect(summaryFromBroadcast()).toBeUndefined();
  });
});
