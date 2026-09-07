/**
 * Live Vocab Quiz — how a round ends, and who is allowed to end it.
 *
 * Split out of `vocabQuizHandler` because ending a quiz is no longer a purely
 * internal affair: the board lifecycle has to be able to ask "is this room a
 * quiz, and if so, handle this yourself" without importing the whole socket
 * handler. Keeping both the end path and that question in one module means
 * there is exactly one place that knows how a quiz finishes.
 *
 * Background — game GHYRVS, 2026-09-05. A quiz room sets neither
 * `gameStartedAt` nor a board timer, because the quiz owns its own clock and
 * the grid is a placeholder nothing draws. Every board heuristic therefore
 * reads a perfectly healthy quiz as an orphaned round. A student's 15s
 * results watchdog fired mid-quiz, `requestResults` reached the board's orphan
 * guard, and the guard force-ended the room through `endGame` — which
 * persisted BOARD-shaped results and took the once-per-game Redis key. The
 * quiz's own `finishQuiz` ran 29 seconds later and was refused as a duplicate.
 * Class 3 (asymmetric paths) producing a Class 4 (silent no-op).
 */

import type { Server, Socket } from 'socket.io';

import {
  getClassroomGame,
  updateClassroomGameStatus,
} from '../modules/classroomGameManager.js';
import { getUsernameBySocketId, transitionGameState } from '../modules/gameStateManager.js';
import { persistClassroomGameScores } from '../handlers/classroomGamePersistence.js';
import {
  quizStandings,
  snapshotFor,
  correctWordsByUser,
  askedWords,
  answersByUser,
  type VocabQuizSession,
} from './vocabQuizEngine.js';
import { getQuizSession, deleteQuizSession } from '../modules/vocabQuizStore.js';
import { VOCAB_QUIZ_EVENTS, VOCAB_QUIZ_REVEAL_MS } from '@/shared/types/vocabQuiz';
import { getGameRoom } from '../utils/socketHelpers.js';
import { clearGameTimer } from '../utils/timerManager.js';
import logger from '../utils/logger.js';

/**
 * How far past its own question clock a round may drift before we call the
 * quiz stalled. Only a dead ticker gets here — a normal question is cut short
 * by the 250ms tick the moment it expires — so the grace is generous enough
 * that no live round is ever mistaken for a stuck one.
 */
const QUIZ_STALL_GRACE_MS = 30_000;

function toRoom(io: Server, gameCode: string, event: string, payload: unknown): void {
  io.to(getGameRoom(gameCode)).emit(event, payload);
}

/**
 * Close the round: stop the clock, tell the room, and write the results
 * through the classroom persistence path.
 *
 * `wordsFound` carries the LESSON word for every question the student answered
 * correctly. `upsertLessonProgress` marks every lesson word attempted and only
 * these mastered, which is exactly the required mapping: a wrong answer on W
 * leaves W attempted-not-mastered.
 */
export async function finishQuiz(io: Server, gameCode: string): Promise<void> {
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

/** A round nothing will ever advance again — the 250ms ticker is gone. */
function quizStalled(session: VocabQuizSession, now: number): boolean {
  if (session.paused) return false;
  return now - session.questionStartedAt > session.limitMs + VOCAB_QUIZ_REVEAL_MS + QUIZ_STALL_GRACE_MS;
}

/**
 * The board lifecycle's `requestResults` handler, answered on behalf of a quiz.
 *
 * Returns false when this room has no quiz, so board recovery is untouched.
 * Returns true once the quiz has dealt with the client — either by re-sending
 * that socket's own state (the round is live and the client simply lost the
 * thread) or, if the round is genuinely stalled, by ending it through the QUIZ
 * path so the students' answers still reach the teacher's report.
 *
 * Declining without ending a stalled round would only swap the board's wrong
 * ending for a room that can never end at all.
 */
export function handleQuizRequestResults(io: Server, socket: Socket, gameCode: string): boolean {
  const session = getQuizSession(gameCode);
  if (!session) return false;

  const now = Date.now();
  if (quizStalled(session, now)) {
    logger.warn(
      'VOCAB_QUIZ',
      `requestResults on stalled quiz ${gameCode} (question ${session.index + 1} idle for ` +
        `${Math.round((now - session.questionStartedAt) / 1000)}s) — finishing through the quiz path`
    );
    void finishQuiz(io, gameCode);
    return true;
  }

  const username = getUsernameBySocketId(socket.id) ?? '';
  socket.emit(VOCAB_QUIZ_EVENTS.state, snapshotFor(session, username, now));
  logger.info(
    'VOCAB_QUIZ',
    `requestResults on live quiz ${gameCode} — re-sent state to ${socket.id} instead of ending the room`
  );
  return true;
}
