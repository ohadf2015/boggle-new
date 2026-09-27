/**
 * A room running a live vocab quiz must never be persisted by the BOARD end
 * path (RED first).
 *
 * This is the second half of the GHYRVS failure and it survives the orphan-guard
 * fix. The guard is one entrance to `endGame`; host disconnect, room close and
 * the resume/reconnect paths are others. Whichever one fires, the board's
 * `calculateAndBroadcastFinalScores` reaches the classroom persistence block
 * with BOARD-shaped results: every student found zero words, because a quiz
 * puts no words on a grid.
 *
 * That used to be invisible — the persistence loop read `game.players`, which
 * is empty for a quiz room, so it wrote nothing. Now that participants come
 * from the union of the roster and the scores, the very same call would write
 * one row per student showing 0 of 8 words found, then legitimately keep the
 * once-per-game idempotency key and turn the quiz's real `finishQuiz` away as a
 * duplicate. A report that says the whole class scored zero is worse than the
 * empty one this work started from.
 *
 * `hasQuizSession` is the predicate that already guards `teacherControlsHandler`.
 * `finishQuiz` deletes the session BEFORE it persists, so the quiz's own write
 * is never caught by this guard.
 */

vi.mock('../../../modules/gameStateManager', () => ({ getGame: vi.fn() }));
vi.mock('../../../dictionary', () => ({ isDictionaryWord: vi.fn().mockReturnValue(true) }));
vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn().mockReturnValue(false),
  isWordValidForScoring: vi.fn().mockReturnValue(false),
}));
vi.mock('../../../modules/achievementManager', () => ({ awardFinalAchievements: vi.fn(), ACHIEVEMENT_ICONS: {} }));
vi.mock('../../../modules/playerTitlesManager', () => ({ calculatePlayerTitles: vi.fn().mockReturnValue({}) }));
vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:QZ'),
}));
vi.mock('../../../modules/supabaseServer', () => ({ isSupabaseConfigured: vi.fn().mockReturnValue(false) }));
vi.mock('../../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(),
  updateClassroomGameStatus: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../handlers/classroomGamePersistence', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../../handlers/classroomGamePersistence')>();
  return { ...real, persistClassroomGameScores: vi.fn().mockResolvedValue([]) };
});

import { vi, type Mock } from 'vitest';
import { getGame } from '../../../modules/gameStateManager';
import { getClassroomGame, updateClassroomGameStatus } from '../../../modules/classroomGameManager';
import { persistClassroomGameScores } from '../../../handlers/classroomGamePersistence';
import { setQuizSession, clearAllQuizSessions } from '../../../modules/vocabQuizStore';
import { createQuizSession } from '../../vocabQuizEngine';
import { calculateAndBroadcastFinalScores } from '../gameScores';

const mockGetGame = getGame as Mock;
const mockGetClassroomGame = getClassroomGame as Mock;
const mockPersist = persistClassroomGameScores as Mock;
const mockStatus = updateClassroomGameStatus as Mock;

const GAME_CODE = 'QZROOM';

function ioMock() {
  const emit = vi.fn();
  return { io: { to: vi.fn(() => ({ emit })) } as never, emit };
}

/** A quiz room as the board engine sees it: real students, nobody found a word. */
function quizRoom() {
  return {
    gameState: 'finished',
    gameMode: 'classic',
    language: 'en',
    hostUsername: 'MsK',
    users: {
      MsK: { isBot: false, isHost: true, authUserId: 'u-teacher' },
      Ana: { isBot: false, authUserId: 'u-ana' },
      Ben: { isBot: false, authUserId: 'u-ben' },
    },
    playerWords: { MsK: [], Ana: [], Ben: [] },
    playerWordDetails: { MsK: [], Ana: [], Ben: [] },
    playerScores: { MsK: 0, Ana: 0, Ben: 0 },
    playerAchievements: {},
    letterGrid: [['A']],
    gameSessionId: 'sess-quiz',
    isClassroom: true,
  };
}

const classroomGame = {
  gameCode: GAME_CODE,
  classroomId: 'c1',
  teacherId: 'u-teacher',
  teacherName: 'Ms K',
  lessonIds: ['l1'],
  lessonNames: ['Unit 3'],
  vocabularyWords: ['abandon', 'brittle', 'candid'],
  players: [],
  status: 'playing',
  settings: { gameMode: 'vocab-quiz' },
};

function startLiveQuiz() {
  const session = createQuizSession({
    gameCode: GAME_CODE,
    classroomId: 'c1',
    words: [
      { word: 'abandon', definition: 'to leave behind for good', canIntegrate: true },
      { word: 'brittle', definition: 'hard but easily broken', canIntegrate: true },
      { word: 'candid', definition: 'honest and direct', canIntegrate: true },
      { word: 'dwindle', definition: 'to shrink little by little', canIntegrate: true },
      { word: 'endure', definition: 'to keep going through hardship', canIntegrate: true },
    ],
    focus: 'any',
    questionCount: 5,
    secondsPerQuestion: 20,
    seed: 'seed-quiz',
    now: Date.now(),
    language: 'en',
  });
  setQuizSession(GAME_CODE, session);
}

describe('the board end path and a live vocab quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllQuizSessions();
    mockGetClassroomGame.mockResolvedValue(classroomGame);
  });
  afterEach(() => clearAllQuizSessions());

  it('writes nothing when a quiz still owns the room — the quiz persists its own round', async () => {
    startLiveQuiz();
    mockGetGame.mockReturnValue(quizRoom());
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, GAME_CODE);

    expect(mockPersist).not.toHaveBeenCalled();
  });

  it('does not retire the classroom game either, so the quiz can still finish it', async () => {
    startLiveQuiz();
    mockGetGame.mockReturnValue(quizRoom());
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, GAME_CODE);

    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('persists normally once the quiz has handed the room back (finishQuiz deletes the session first)', async () => {
    // No quiz session in the registry — exactly the state finishQuiz leaves.
    mockGetGame.mockReturnValue(quizRoom());
    const { io } = ioMock();

    await calculateAndBroadcastFinalScores(io, GAME_CODE);

    expect(mockPersist).toHaveBeenCalled();
  });
});
