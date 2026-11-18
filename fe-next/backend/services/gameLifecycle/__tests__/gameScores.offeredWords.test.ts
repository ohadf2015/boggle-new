vi.mock('../../../modules/gameStateManager', () => ({ getGame: vi.fn() }));
vi.mock('../../../dictionary', () => ({ isDictionaryWord: vi.fn().mockReturnValue(true) }));
vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn().mockReturnValue(false),
  isWordValidForScoring: vi.fn().mockReturnValue(false),
}));
vi.mock('../../../modules/achievementManager', () => ({ awardFinalAchievements: vi.fn(), ACHIEVEMENT_ICONS: {} }));
vi.mock('../../../modules/playerTitlesManager', () => ({ calculatePlayerTitles: vi.fn().mockReturnValue({}) }));
vi.mock('../../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), getGameRoom: vi.fn().mockReturnValue('room') }));
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

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { getClassroomGame } from '../../../modules/classroomGameManager';
import { broadcastToRoom } from '../../../utils/socketHelpers';
import { persistClassroomGameScores } from '../../../handlers/classroomGamePersistence';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const io = { to: vi.fn(() => ({ emit: vi.fn() })) } as never;
const persisted = persistClassroomGameScores as unknown as Mock;

const classroomGame = {
  gameCode: 'CLS', classroomId: 'c1', teacherId: 'u-teacher', teacherName: 'Ms T',
  lessonIds: ['l1'], lessonNames: ['Unit 3'], vocabularyWords: ['hello', 'world', 'castle'],
  placedVocabulary: ['hello', 'world', 'castle'],
  players: [{ userId: 'u-alice', username: 'alice' }],
  status: 'playing', settings: { gameMode: 'classic' },
};

function round(gameMode: string, extra: Record<string, unknown> = {}) {
  return {
    gameState: 'finished', gameMode, language: 'en', hostUsername: 'teacher',
    users: { teacher: { isHost: true, authUserId: 'u-teacher' }, alice: { authUserId: 'u-alice' } },
    playerWords: { teacher: [], alice: [] },
    playerWordDetails: { teacher: [], alice: [] },
    playerScores: { teacher: 0, alice: 100 },
    playerAchievements: {}, letterGrid: [], gameSessionId: 2, isClassroom: true,
    ...extra,
  };
}

const summary = () => (broadcastToRoom as Mock).mock.calls.find((c) => c[2] === 'validatedScores')?.[3]?.classroomSummary;

beforeEach(() => {
  vi.clearAllMocks();
  (getClassroomGame as Mock).mockResolvedValue(classroomGame);
});

describe('GIVEN the round recorded which lesson words it offered', () => {
  it('WHEN it ends THEN the writer and the recap use that list, not the stored board list', async () => {
    (getGame as Mock).mockReturnValue(round('classic', { classroomOfferedWords: ['hello'] }));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    expect(persisted.mock.calls[0][2]).toMatchObject({ offeredWords: ['hello'] });
    expect(summary().neverPlacedWords.sort()).toEqual(['castle', 'world']);
  });

  it('WHEN the round offered none THEN every lesson word is never-placed, not a reteach word', async () => {
    (getGame as Mock).mockReturnValue(round('wheel-rush', { classroomOfferedWords: [] }));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    expect(persisted.mock.calls[0][2]).toMatchObject({ offeredWords: [] });
    expect(summary().neverPlacedWords.sort()).toEqual(['castle', 'hello', 'world']);
  });
});

describe('GIVEN the recap counts each student against the lesson', () => {
  const foundHello = { alice: [{ word: 'hello', validated: true, score: 5 }], teacher: [] };

  it('WHEN one of three lesson words was offered and found THEN the student is 1 of 1', async () => {
    (getGame as Mock).mockReturnValue(round('classic', { classroomOfferedWords: ['hello'], playerWordDetails: foundHello, playerWords: { teacher: [], alice: ['hello'] } }));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    expect(summary().masteryByPlayer.alice).toEqual({ found: 1, total: 1 });
  });

  it('WHEN no lesson word was offered THEN the student has nothing to be measured against', async () => {
    (getGame as Mock).mockReturnValue(round('wheel-rush', { classroomOfferedWords: [] }));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    expect(summary().masteryByPlayer.alice).toEqual({ found: 0, total: 0 });
    expect(summary().podium[0].totalWords).toBeUndefined();
  });
});

describe('GIVEN a room restored mid-round without the list', () => {
  it('WHEN it ends THEN the writer is told the offered words are unknown', async () => {
    (getGame as Mock).mockReturnValue(round('classic'));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    expect(persisted.mock.calls[0][2].offeredWords).toBeUndefined();
  });
});

describe('GIVEN a lesson crossword, which banks no words', () => {
  it('WHEN it ends THEN each solved clue reaches the writer as a found word', async () => {
    (getGame as Mock).mockReturnValue(round('crossword', {
      classroomOfferedWords: ['hello', 'world'],
      crosswordMpState: {
        players: ['alice'],
        puzzle: { id: 'lesson', slots: [{ id: 'A1', answer: 'hello' }, { id: 'D2', answer: 'world' }] },
        lessonWordBySlot: { A1: 'hello', D2: 'world' },
        progress: { alice: { percent: 50, solved: false, elapsedMs: 1, score: 10, solvedSlotIds: ['D2'] } },
        startedAt: 0,
      },
    }));
    await calculateAndBroadcastFinalScores(io, 'CLS');
    const alice = persisted.mock.calls[0][1].find((p: { userId: string }) => p.userId === 'u-alice');
    expect(alice.wordsFound).toEqual(['world']);
  });
});
