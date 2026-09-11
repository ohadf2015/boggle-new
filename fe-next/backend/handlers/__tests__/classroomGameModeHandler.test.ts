/**
 * Switching the game from inside a live lobby — WITHOUT minting a new code.
 *
 * Round 1 shipped a picker that only exists BEFORE the room. Once GO LIVE had
 * fired, changing the mode meant exiting — which tears the room down for every
 * student already in it — and coming back with a different six-character code
 * the class has to retype. A blind critic reproduced exactly that.
 *
 * The room's mode is not one value. The board path reads the client's
 * `startGame` payload; the QUIZ path reads `settings.gameMode` off the Redis
 * classroom record (`vocabQuizHandler.startVocabQuizForClassroom` returns false
 * for anything else). So a switch that only moved client state would flip
 * Classic→Blast and silently fail Classic→Vocab Quiz — recurring pitfall class
 * 3, two paths to the same outcome that do not agree. This event is the server
 * half; `useClassroomModeSwitch` writes the client half in the same call.
 *
 * The code is the contract: every assertion below re-checks that the record
 * still carries the SAME `gameCode` afterwards.
 */
import { vi, type Mock } from 'vitest';

const { mockGetClassroomGame, mockSetMode, mockBroadcastToRoom } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetMode: vi.fn(),
  mockBroadcastToRoom: vi.fn(),
}));

vi.mock('../../modules/classroomGameManager', () => ({
  createClassroomGame: vi.fn(),
  getClassroomGame: mockGetClassroomGame,
  getActiveClassroomGames: vi.fn(),
  addPlayerToClassroomGame: vi.fn(),
  removePlayerFromClassroomGame: vi.fn(),
  updateClassroomGameStatus: vi.fn(),
}));
vi.mock('../../modules/classroomGameSettings', () => ({
  setClassroomGameMode: mockSetMode,
}));
vi.mock('../../modules/gameStateManager', () => ({
  deleteGame: vi.fn(),
  getGame: vi.fn(),
  getActiveRooms: vi.fn(() => []),
  getGameBySocketId: vi.fn(),
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  broadcastActiveRooms: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  safeEmit: vi.fn(),
}));
vi.mock('../classroomGamePersistence', () => ({ persistClassroomGameScores: vi.fn() }));
vi.mock('../classroomGamePersistence.js', () => ({ persistClassroomGameScores: vi.fn() }));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  isClassroomTeacher: vi.fn(),
  isClassroomStudent: vi.fn(),
  getClassroomRole: vi.fn(),
  getClassroomMembershipLevel: vi.fn(),
  resolveClassroomTeacher: vi.fn(),
  resolveClassroomStudent: vi.fn(),
  resolveClassroomRole: vi.fn(),
  resolveClassroomName: vi.fn(async () => 'Ms K Class'),
}));
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn(() => true),
  default: { checkRateLimit: vi.fn(() => true) },
}));
vi.mock('../../utils/socketValidation', () => {
  const { z } = require('zod');
  return {
    validatePayload: vi.fn((_schema: unknown, data: unknown) => ({ success: true, data })),
    gameCodeSchema: z.string(),
    usernameSchema: z.string(),
  };
});
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { registerClassroomGameModeHandlers } from '../classroomGameModeHandler';

const TEACHER_ID = '00000000-0000-4000-8000-0000000000aa';
const OTHER_ID = '00000000-0000-4000-8000-0000000000bb';
const CLASSROOM_ID = '00000000-0000-4000-8000-0000000000cc';
const CODE = 'ABC123';

function makeSocket(authUserId: string) {
  return {
    id: 'socket-1',
    on: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: { verifiedUserId: authUserId },
    handshake: { auth: {} },
  } as never as { on: Mock; emit: Mock };
}

const roomEmit = vi.fn();
const makeIo = () => ({ to: vi.fn(() => ({ emit: roomEmit })), emit: vi.fn() }) as never;

function handlerOf(socket: { on: Mock }) {
  const entry = socket.on.mock.calls.find((c: unknown[]) => c[0] === 'updateClassroomGameMode');
  if (!entry) throw new Error('updateClassroomGameMode was never registered');
  return entry[1] as (data: unknown) => Promise<void>;
}

const waitingGame = {
  gameCode: CODE,
  classroomId: CLASSROOM_ID,
  teacherId: TEACHER_ID,
  teacherName: 'Ms K',
  players: [],
  status: 'waiting',
  vocabularyWords: [],
  lessonIds: [],
  settings: { gameMode: 'classic' },
};

describe('updateClassroomGameMode — the room keeps its code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomGame.mockResolvedValue({ ...waitingGame, settings: { gameMode: 'classic' } });
    mockSetMode.mockResolvedValue(true);
  });

  it('rewrites the stored mode on the SAME game code and never creates a second one', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'vocab-quiz' });

    expect(mockSetMode).toHaveBeenCalledWith(CODE, 'vocab-quiz');
    // Nothing on this path may look like "make me a room".
    expect(socket.emit.mock.calls.map((c) => c[0])).not.toContain('classroomGameCreated');
  });

  /**
   * The quiz branch is the reason this event exists at all: the server decides
   * quiz-vs-board from the RECORD, so a switch that skipped Redis would start a
   * letter grid for a teacher who asked for a quiz.
   */
  it('confirms the switch to the teacher with the code it applied to', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'blast' });

    const ack = socket.emit.mock.calls.find((c) => c[0] === 'classroomGameModeChanged');
    expect(ack).toBeDefined();
    expect(ack![1]).toMatchObject({ gameCode: CODE, gameMode: 'blast' });
  });

  /** Students in the room are told, so their lobby card stops lying. */
  it('tells the room and the classroom about the new mode', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'word-hunt' });

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      expect.anything(),
      `game:${CODE}`,
      'classroomGameModeChanged',
      expect.objectContaining({ gameCode: CODE, gameMode: 'word-hunt' })
    );
    expect(roomEmit).toHaveBeenCalledWith(
      'classroomGameModeChanged',
      expect.objectContaining({ gameCode: CODE, gameMode: 'word-hunt' })
    );
  });

  it('refuses a teacher who does not own the room, out loud', async () => {
    const socket = makeSocket(OTHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'blast' });

    expect(mockSetMode).not.toHaveBeenCalled();
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('classroomGameError');
  });

  /**
   * Mid-round is the one refusal with a reason a teacher can act on: swapping
   * the engine under a class that is already playing would end the round for
   * everyone. Loud, not a silent no-op (pitfall class 4).
   */
  it('refuses while a round is actually running and says why', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...waitingGame, status: 'playing' });
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'blast' });

    expect(mockSetMode).not.toHaveBeenCalled();
    const err = socket.emit.mock.calls.find((c) => c[0] === 'classroomGameError');
    expect(err).toBeDefined();
    expect(err![1]).toMatchObject({ error: 'education.modePicker.switchMidRound' });
  });

  it('answers a missing room instead of vanishing', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'blast' });

    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('classroomGameError');
  });

  it('rejects a mode that is not a classroom mode', async () => {
    const socket = makeSocket(TEACHER_ID);
    registerClassroomGameModeHandlers(makeIo(), socket as never);

    await handlerOf(socket)({ gameCode: CODE, gameMode: 'crossword' });

    expect(mockSetMode).not.toHaveBeenCalled();
    expect(socket.emit.mock.calls.map((c) => c[0])).toContain('classroomGameError');
  });
});
