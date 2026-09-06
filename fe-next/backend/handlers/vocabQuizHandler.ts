/**
 * Live Vocab Quiz — socket handler.
 *
 * Owns the wall clock and the wire for a quiz round: it starts a session in
 * place of the board game, ticks the per-question timer, broadcasts questions
 * and reveals, scores answers through the engine, and closes the round through
 * the SAME classroom persistence path every other classroom mode uses, so the
 * teacher's report fills in without a second data path to keep in sync.
 *
 * Two design notes worth keeping:
 *
 * 1. The quiz is NOT a `GameMode`. It travels as a classroom setting, so it
 *    never leaks into random-mode rolls, quick play, or the board engine's
 *    per-mode scoring branches.
 *
 * 2. Teacher controls reuse the existing `pauseGame` / `resumeGame` /
 *    `endRoundNow` / `skipTargetWord` events rather than inventing quiz-only
 *    ones, so the teacher's live control bar works unchanged. Socket.IO allows
 *    several listeners per event: ours returns early when the room has no quiz,
 *    and `teacherControlsHandler`'s returns early because a quiz room never has
 *    a running board timer to pause.
 */

import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import {
  getClassroomGame,
  updateClassroomGameStatus,
} from '../modules/classroomGameManager.js';
import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  transitionGameState,
} from '../modules/gameStateManager.js';
import { loadLessonVocabulary } from '../services/vocabQuizLessonWords.js';
import { persistClassroomGameScores } from './classroomGamePersistence.js';
import {
  createQuizSession,
  addQuizPlayer,
  submitQuizAnswer,
  everyoneAnswered,
  questionExpired,
  buildQuestionPayload,
  buildReveal,
  advanceQuiz,
  quizStandings,
  snapshotFor,
  pauseQuiz,
  resumeQuiz,
  correctWordsByUser,
  askedWords,
  answersByUser,
  type VocabQuizSession,
} from '../services/vocabQuizEngine.js';
import {
  setQuizSession,
  getQuizSession,
  setQuizTimer,
  deleteQuizSession,
  clearAllQuizSessions,
} from '../modules/vocabQuizStore.js';
import {
  VOCAB_QUIZ_EVENTS,
  VOCAB_QUIZ_MODE,
  VOCAB_QUIZ_REVEAL_MS,
  VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
  VOCAB_QUIZ_DEFAULT_SECONDS,
} from '@/shared/types/vocabQuiz';
import { isPracticeFocusSetting } from '@/lib/education/vocabFocus';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

/** How often the round clock is checked. Fine-grained enough to feel instant. */
const TICK_MS = 250;

/**
 * The mode reported to the client shells in the start payload. The quiz is not
 * a `GameMode`, but the shells demand one; they branch to the quiz surface on
 * the server's quiz traffic before any board is drawn, so this value is only
 * ever used to satisfy their mount conditions.
 */
const QUIZ_SHELL_GAME_MODE = 'classic';

/** Never rendered — see the start sequence for why it has to exist. */
const QUIZ_PLACEHOLDER_GRID = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const answerSchema = z.object({
  index: z.number().int().min(0).max(200),
  choiceIndex: z.number().int().min(0).max(9),
});

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

function toRoom(io: Server, gameCode: string, event: string, payload: unknown): void {
  io.to(getGameRoom(gameCode)).emit(event, payload);
}

function emitQuestion(io: Server, session: VocabQuizSession, now: number): void {
  toRoom(io, session.gameCode, VOCAB_QUIZ_EVENTS.question, buildQuestionPayload(session, now));
}

function emitReveal(io: Server, session: VocabQuizSession): void {
  toRoom(io, session.gameCode, VOCAB_QUIZ_EVENTS.reveal, buildReveal(session));
}

// ---------------------------------------------------------------------------
// Round lifecycle
// ---------------------------------------------------------------------------

/**
 * Close the round: stop the clock, tell the room, and write the results
 * through the classroom persistence path.
 *
 * `wordsFound` carries the LESSON word for every question the student answered
 * correctly. `upsertLessonProgress` marks every lesson word attempted and only
 * these mastered, which is exactly the required mapping: a wrong answer on W
 * leaves W attempted-not-mastered.
 */
async function finishQuiz(io: Server, gameCode: string): Promise<void> {
  const session = getQuizSession(gameCode);
  if (!session) return;

  // Take the session out of the registry FIRST so a late tick or a second
  // `endRoundNow` cannot drive this path twice.
  deleteQuizSession(gameCode);

  const standings = quizStandings(session);
  toRoom(io, gameCode, VOCAB_QUIZ_EVENTS.ended, {
    gameCode,
    standings,
    totalQuestions: session.questions.length,
  });

  // Retire the room in the board engine's state machine too, so its timeout
  // path can never fire a second, board-shaped end for this room.
  try {
    transitionGameState(gameCode, 'END', { immediate: true });
    clearGameTimer(gameCode);
  } catch (err) {
    logger.warn('VOCAB_QUIZ', `Could not retire room ${gameCode}: ${(err as Error).message}`);
  }

  try {
    const classroomGame = await getClassroomGame(gameCode);
    if (!classroomGame) return;

    await updateClassroomGameStatus(gameCode, 'finished');

    const wordsByUser = correctWordsByUser(session);
    const scoreByUser = new Map<string, number>();
    for (const player of session.players.values()) {
      if (player.userId) scoreByUser.set(player.userId, player.score);
    }

    const playerScores = [...wordsByUser.entries()].map(([userId, wordsFound]) => ({
      userId,
      score: scoreByUser.get(userId) ?? 0,
      wordsFound,
    }));

    // The asked set is what stops the teacher's reteach list filling with
    // words the class never saw; the answers give the report per-question
    // detail that would otherwise die with the in-memory session.
    const rewards = await persistClassroomGameScores(classroomGame, playerScores, {
      askedWords: askedWords(session),
      answersByUser: answersByUser(session),
    });
    io.to(`classroom:${classroomGame.classroomId}`).emit('classroomGameEnded', { gameCode, rewards });

    logger.info(
      'VOCAB_QUIZ',
      `Quiz ${gameCode} finished: ${session.questions.length} questions, ${playerScores.length} students recorded`
    );
  } catch (err) {
    logger.error('VOCAB_QUIZ', `Failed to persist quiz ${gameCode}: ${(err as Error).message}`);
  }
}

/** Move from the live question into the reveal beat. */
function beginReveal(io: Server, session: VocabQuizSession, now: number): void {
  session.phase = 'reveal';
  session.revealEndsAt = now + VOCAB_QUIZ_REVEAL_MS;
  emitReveal(io, session);
}

/**
 * One clock tick. Everything time-driven happens here so there is a single
 * place where "the question ended" is decided — not one rule for the timer and
 * a different one for everyone-answered.
 */
function tick(io: Server, gameCode: string): void {
  const session = getQuizSession(gameCode);
  if (!session) return;

  const now = Date.now();

  if (session.paused) return;

  if (session.phase === 'question') {
    if (questionExpired(session, now) || everyoneAnswered(session)) {
      beginReveal(io, session, now);
    }
    return;
  }

  if (session.phase === 'reveal') {
    if (now < session.revealEndsAt) return;
    const phase = advanceQuiz(session, now);
    if (phase === 'ended') {
      void finishQuiz(io, gameCode);
    } else {
      emitQuestion(io, session, now);
    }
  }
}

function startTicking(io: Server, gameCode: string): void {
  const timer = setInterval(() => tick(io, gameCode), TICK_MS);
  // Never hold the process open for a quiz nobody is watching.
  if (typeof timer.unref === 'function') timer.unref();
  setQuizTimer(gameCode, timer);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function readQuizSettings(settings: Record<string, unknown> | undefined) {
  const focusRaw = settings?.vocabQuizFocus;
  const focus = isPracticeFocusSetting(focusRaw) ? focusRaw : 'any';
  const count = Number(settings?.vocabQuizQuestionCount);
  const seconds = Number(settings?.vocabQuizSeconds);
  return {
    focus,
    questionCount: Number.isFinite(count) && count > 0 ? count : VOCAB_QUIZ_DEFAULT_QUESTION_COUNT,
    secondsPerQuestion: Number.isFinite(seconds) && seconds > 0 ? seconds : VOCAB_QUIZ_DEFAULT_SECONDS,
  };
}

/**
 * Start a live vocab quiz for this room, if that is what the teacher chose.
 *
 * Returns true when the quiz has taken over the room — the caller (the
 * `startGame` handler) must then return without generating a grid or starting
 * the room timer. Returns false for every other room so the board path runs
 * exactly as before.
 */
export async function startVocabQuizForClassroom(io: Server, gameCode: string): Promise<boolean> {
  let classroomGame;
  try {
    classroomGame = await getClassroomGame(gameCode);
  } catch (err) {
    logger.warn('VOCAB_QUIZ', `Classroom lookup failed for ${gameCode}: ${(err as Error).message}`);
    return false;
  }
  if (!classroomGame) return false;

  const settings = (classroomGame.settings ?? {}) as Record<string, unknown>;
  if (settings.gameMode !== VOCAB_QUIZ_MODE) return false;

  const { focus, questionCount, secondsPerQuestion } = readQuizSettings(settings);
  const { words, language } = await loadLessonVocabulary(classroomGame.lessonIds ?? []);

  const session = createQuizSession({
    gameCode,
    classroomId: classroomGame.classroomId,
    words,
    focus,
    questionCount,
    secondsPerQuestion,
    seed: `${gameCode}:${Date.now()}`,
    now: Date.now(),
    language,
  });

  if (session.questions.length === 0) {
    // Loud, not silent: a teacher standing in front of a class needs to know
    // WHY nothing started, and needs the board game not to have been skipped.
    logger.error(
      'VOCAB_QUIZ',
      `Refusing to start quiz ${gameCode}: lesson has no quizzable words ` +
        `(${words.length} words loaded, focus '${focus}')`
    );
    io.to(`classroom:${classroomGame.classroomId}`).emit('classroomGameError', {
      error: 'vocabQuiz.errors.noQuestions',
      gameCode,
    });
    toRoom(io, gameCode, 'classroomGameError', { error: 'vocabQuiz.errors.noQuestions', gameCode });
    return false;
  }

  // Enrol the humans already in the room. Bots have no vocabulary to learn and
  // would otherwise sit at zero on the projector standings all round.
  const room = getGame(gameCode);
  for (const [username, user] of Object.entries(room?.users ?? {})) {
    const gameUser = user as { isBot?: boolean; authUserId?: string | null; isHost?: boolean };
    if (gameUser.isBot) continue;
    if (gameUser.isHost) continue; // the teacher hosts, they do not compete
    addQuizPlayer(session, { username, userId: gameUser.authUserId ?? null });
  }

  setQuizSession(gameCode, session);
  startTicking(io, gameCode);

  const now = Date.now();
  session.questionStartedAt = now;

  // Move every client out of the lobby FIRST.
  //
  // The host and player shells only mount their in-game view once the normal
  // start sequence has landed — the host gate is literally "is there a
  // `tableData`". Emitting only quiz events would leave the whole class sitting
  // in the lobby while a round ran on the server: the same dead end as the
  // classroom join bugs in `7add65b9a`. Wheel Rush has the same shape (a mode
  // that ignores the grid) and solves it the same way — it rides the standard
  // payload and simply never renders the board.
  //
  // The grid is a placeholder that no quiz surface ever draws; it exists only
  // to satisfy the shells' mount conditions.
  broadcastToRoom(io, getGameRoom(gameCode), 'gameStarting', { gameMode: QUIZ_SHELL_GAME_MODE });
  broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
    letterGrid: QUIZ_PLACEHOLDER_GRID,
    timerSeconds: Math.ceil((session.limitMs * session.questions.length) / 1000),
    language: 'en',
    minWordLength: 3,
    messageId: `vocab-quiz-${gameCode}-${now}`,
    gameSessionId: `${gameCode}:${now}`,
    boardTheme: null,
    gameMode: QUIZ_SHELL_GAME_MODE,
    goldenLetters: [],
  });

  // The question broadcast is itself the "a quiz is live" signal. A room-wide
  // snapshot would carry myScore/myStreak of 0 to everyone, and a student who
  // had just reconnected with a correct snapshot would see it zeroed. Snapshots
  // are per-socket only, in reply to `requestState`.
  emitQuestion(io, session, now);

  logger.info(
    'VOCAB_QUIZ',
    `Started quiz ${gameCode}: ${session.questions.length} questions, focus ` +
      `${session.focusUsed}${session.fallbackFrom ? ` (fell back from ${session.fallbackFrom})` : ''}, ` +
      `${session.limitMs / 1000}s each, ${session.players.size} students`
  );
  return true;
}

// ---------------------------------------------------------------------------
// Socket registration
// ---------------------------------------------------------------------------

/** The quiz this socket is in, or null. */
function quizForSocket(socket: Socket): { gameCode: string; session: VocabQuizSession } | null {
  const gameCode = getGameBySocketId(socket.id);
  if (!gameCode) return null;
  const session = getQuizSession(gameCode);
  return session ? { gameCode, session } : null;
}

/** Same lookup, but only for the room's host — the teacher. */
function hostQuizForSocket(socket: Socket): { gameCode: string; session: VocabQuizSession } | null {
  const ctx = quizForSocket(socket);
  if (!ctx) return null;
  const room = getGame(ctx.gameCode);
  const username = getUsernameBySocketId(socket.id);
  const isHost =
    room?.hostSocketId === socket.id ||
    (!!username && !!room?.users?.[username]?.isHost);
  return isHost ? ctx : null;
}

export function registerVocabQuizHandlers(io: Server, socket: Socket): void {
  socket.on(VOCAB_QUIZ_EVENTS.answer, (data: unknown) => {
    if (!checkRateLimit(socket.id)) return;
    const ctx = quizForSocket(socket);
    if (!ctx) return;

    const parsed = answerSchema.safeParse(data);
    if (!parsed.success) return;

    const username = getUsernameBySocketId(socket.id);
    if (!username) return;

    const result = submitQuizAnswer(ctx.session, {
      username,
      choiceIndex: parsed.data.choiceIndex,
      index: parsed.data.index,
      now: Date.now(),
    });
    // A null result is a normal race (double tap, late packet, expired clock).
    // The student's UI already shows their locked-in answer; saying nothing is
    // correct here, and there is no state for them to repair.
    if (!result) return;

    socket.emit(VOCAB_QUIZ_EVENTS.answerResult, result);

    // Everyone in — cut to the reveal without waiting out the clock.
    if (everyoneAnswered(ctx.session) && ctx.session.phase === 'question') {
      beginReveal(io, ctx.session, Date.now());
    }
  });

  socket.on(VOCAB_QUIZ_EVENTS.requestState, () => {
    if (!checkRateLimit(socket.id)) return;
    const ctx = quizForSocket(socket);
    if (!ctx) return;
    const username = getUsernameBySocketId(socket.id) ?? '';
    // A student who refreshed mid-round may not be in the roster any more.
    // Re-enrol before snapshotting so their score is theirs, not a fresh zero.
    const room = getGame(ctx.gameCode);
    const user = username ? room?.users?.[username] : undefined;
    if (username && user && !user.isBot && !user.isHost) {
      addQuizPlayer(ctx.session, { username, userId: user.authUserId ?? null });
    }
    socket.emit(VOCAB_QUIZ_EVENTS.state, snapshotFor(ctx.session, username, Date.now()));
  });

  // ---- Teacher live controls (same events the board modes use) ----

  socket.on('pauseGame', () => {
    const ctx = hostQuizForSocket(socket);
    if (!ctx) return;
    if (pauseQuiz(ctx.session, Date.now())) {
      toRoom(io, ctx.gameCode, VOCAB_QUIZ_EVENTS.paused, { gameCode: ctx.gameCode, paused: true });
    }
  });

  socket.on('resumeGame', () => {
    const ctx = hostQuizForSocket(socket);
    if (!ctx) return;
    if (resumeQuiz(ctx.session, Date.now())) {
      toRoom(io, ctx.gameCode, VOCAB_QUIZ_EVENTS.paused, { gameCode: ctx.gameCode, paused: false });
      emitQuestion(io, ctx.session, Date.now());
    }
  });

  socket.on('extendTime', (data?: { seconds?: unknown }) => {
    const ctx = hostQuizForSocket(socket);
    if (!ctx) return;
    if (ctx.session.phase !== 'question') return;
    const raw = Number(data?.seconds);
    const seconds = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 120) : 30;
    // Push the start back so the current question gains time, rather than
    // changing limitMs — the speed bonus stays scaled to the question's own
    // advertised clock instead of silently inflating for everyone.
    ctx.session.questionStartedAt += seconds * 1_000;
    emitQuestion(io, ctx.session, Date.now());
  });

  // "Skip this one" — the quiz reading of the word-hunt skip control.
  socket.on('skipTargetWord', () => {
    const ctx = hostQuizForSocket(socket);
    if (!ctx) return;
    if (ctx.session.phase !== 'question') return;
    beginReveal(io, ctx.session, Date.now());
  });

  socket.on('endRoundNow', () => {
    const ctx = hostQuizForSocket(socket);
    if (!ctx) return;
    void finishQuiz(io, ctx.gameCode);
  });
}

// ---------------------------------------------------------------------------
// Test / shutdown helpers
// ---------------------------------------------------------------------------

/** @internal — inspection hook for tests. */
export function getActiveQuiz(gameCode: string): VocabQuizSession | undefined {
  return getQuizSession(gameCode);
}

/** @internal — tears down every live quiz and its interval. */
export function stopAllQuizzesForTest(): void {
  clearAllQuizSessions();
}

export default registerVocabQuizHandlers;
