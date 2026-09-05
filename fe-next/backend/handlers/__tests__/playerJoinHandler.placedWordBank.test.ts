/**
 * A support student's word bank must list the words actually ON the board.
 *
 * `emitClassroomContext` sent `classroomGame.vocabularyWords` — the teacher's
 * WHOLE lesson. Embedding is best-effort: `generateTableWithEmbeddedWords` caps
 * placement at roughly one word per three cells, skips any word longer than the
 * board, and falls back to a verified board that may carry fewer still. So the
 * student scaffolded most heavily was the one sent hunting for words that are
 * not there.
 *
 * Game start now records the subset it actually placed, and this per-socket
 * emit prefers it. Late join and reconnect both pass through here (the call sits
 * before the reconnect split in `playerJoinHandler`), so they get it too.
 */
import { vi, type Mock } from 'vitest';
import { emitClassroomContextForTest } from '../playerJoinHandler';
import * as classroomGameManager from '../../modules/classroomGameManager';
import * as membership from '../../modules/supabase/classroomMembership';
import { safeEmit } from '../../utils/socketHelpers';

vi.mock('../../modules/classroomGameManager');
vi.mock('../../modules/supabase/classroomMembership', () => ({
  getClassroomMembershipLevel: vi.fn(async () => 'support'),
}));
vi.mock('../../utils/socketHelpers', async () => {
  const actual = await vi.importActual<typeof import('../../utils/socketHelpers')>('../../utils/socketHelpers');
  return { ...actual, safeEmit: vi.fn() };
});
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const LESSON_WORDS = ['PHOTOSYNTHESIS', 'CHLOROPHYLL', 'STOMATA', 'XYLEM'];

let SOCKET: { id: string; data: Record<string, unknown> };
beforeEach(() => { SOCKET = { id: 's1', data: {} }; });

describe('emitClassroomContext — the word bank is what is on the board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (membership.getClassroomMembershipLevel as Mock).mockResolvedValue('support');
  });

  it('sends only the words the board actually placed, once the game has started', async () => {
    // GIVEN a started game where only two of four lesson words fit the grid
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      classroomId: 'c1',
      vocabularyWords: LESSON_WORDS,
      placedVocabulary: ['STOMATA', 'XYLEM'],
      status: 'playing',
    });

    // WHEN a support student joins or reconnects
    await emitClassroomContextForTest(SOCKET as never, 'ABC123', 'user-1');

    // THEN they are not sent hunting for words that are not there
    expect(safeEmit).toHaveBeenCalledWith(SOCKET as never, 'classroomContext', {
      classroomLevel: 'support',
      classroomWordBank: ['STOMATA', 'XYLEM'],
    });
  });

  it('falls back to the full lesson list before the board exists', async () => {
    // GIVEN a game still in the lobby — no board has been generated yet
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      classroomId: 'c1',
      vocabularyWords: LESSON_WORDS,
      status: 'waiting',
    });

    // WHEN a student joins the waiting room
    await emitClassroomContextForTest(SOCKET as never, 'ABC123', 'user-1');

    // THEN they still see what the lesson covers, rather than nothing
    expect(safeEmit).toHaveBeenCalledWith(SOCKET as never, 'classroomContext', {
      classroomLevel: 'support',
      classroomWordBank: LESSON_WORDS,
    });
  });

  it('treats an empty placed list as "board carries none of them"', async () => {
    // GIVEN a started game whose board embedded nothing (every word too long)
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      classroomId: 'c1',
      vocabularyWords: LESSON_WORDS,
      placedVocabulary: [],
      status: 'playing',
    });

    // WHEN a student joins
    await emitClassroomContextForTest(SOCKET as never, 'ABC123', 'user-1');

    // THEN an empty bank is honest — StudentWordBank renders nothing rather
    // than a list of words the student cannot possibly find
    expect(safeEmit).toHaveBeenCalledWith(SOCKET as never, 'classroomContext', {
      classroomLevel: 'support',
      classroomWordBank: [],
    });
  });
  it('caches the resolved level on the socket for the game-start re-send', async () => {
    // GIVEN a support student in a waiting classroom game
    (classroomGameManager.getClassroomGame as Mock).mockResolvedValue({
      classroomId: 'c1',
      vocabularyWords: LESSON_WORDS,
      status: 'waiting',
    });

    // WHEN their context is emitted on join
    await emitClassroomContextForTest(SOCKET as never, 'ABC123', 'user-1');

    // THEN game start can re-send the word bank without demoting them to core
    expect(SOCKET.data.classroomLevel).toBe('support');
  });
});
