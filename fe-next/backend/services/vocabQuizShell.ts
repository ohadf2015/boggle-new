/**
 * The quiz's board-shaped start payload — ONE builder for every path that
 * puts a student into a running Vocab Quiz.
 *
 * The player and host shells only mount their in-game view (where the quiz
 * surface lives) once a `startGame` with a grid and a clock has landed. The
 * quiz has no grid, so it rides a placeholder that no quiz surface draws.
 *
 * That payload used to exist only inside the quiz's opening broadcast. The
 * late-join and reconnect paths built theirs from the ROOM — whose grid is null
 * for the whole quiz — so a student arriving mid-quiz got a `startGame` with no
 * grid and sat in the READY UP lobby while the class answered questions
 * (recurring pitfall class 3: one room, two start payloads). Every door now
 * asks this module, so they cannot drift apart again.
 */

import { getQuizSession } from '../modules/vocabQuizStore.js';
import type { Socket } from 'socket.io';

import { addQuizPlayer, snapshotFor, type VocabQuizSession } from './vocabQuizEngine.js';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

/**
 * The mode reported to the client shells. The quiz is not a `GameMode`, but
 * the shells demand one; they branch to the quiz surface on the server's quiz
 * traffic before any board is drawn, so this only satisfies mount conditions.
 */
export const QUIZ_SHELL_GAME_MODE = 'classic';

/** Never rendered — it exists only to satisfy the shells' mount conditions. */
export const QUIZ_PLACEHOLDER_GRID = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

/** The board-shaped fields of a quiz's `startGame`, for this session. */
export function buildQuizShellStart(session: VocabQuizSession) {
  const timerSeconds = Math.ceil((session.limitMs * session.questions.length) / 1000);
  return {
    letterGrid: QUIZ_PLACEHOLDER_GRID,
    timerSeconds,
    remainingTime: timerSeconds,
    language: 'en',
    minWordLength: 3,
    boardTheme: null,
    gameMode: QUIZ_SHELL_GAME_MODE,
    goldenLetters: [] as string[],
  };
}

/** Shell fields when this room is running a quiz right now, else null. */
export function quizShellStartFor(gameCode: string): ReturnType<typeof buildQuizShellStart> | null {
  const session = getQuizSession(gameCode);
  return session ? buildQuizShellStart(session) : null;
}

/**
 * Seat a socket that arrives mid-quiz: enrol the student so the projector
 * standings list them from their first second, and push the live question
 * right behind the shell start — the same snapshot `requestState` answers —
 * so the quiz surface does not wait on a client round-trip. The teacher hosts
 * and bots have no vocabulary: neither is enrolled, both still get the view.
 */
export function seatLateQuizSocket(
  socket: Socket,
  gameCode: string,
  username: string,
  user: { isHost?: boolean; isBot?: boolean; authUserId?: string | null } | undefined
): void {
  const session = getQuizSession(gameCode);
  if (!session) return;
  if (user && !user.isHost && !user.isBot) {
    addQuizPlayer(session, { username, userId: user.authUserId ?? null });
  }
  socket.emit(VOCAB_QUIZ_EVENTS.state, snapshotFor(session, username, Date.now()));
}
