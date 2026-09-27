/**
 * Live Vocab Quiz — in-process session registry.
 *
 * Deliberately in-memory rather than Redis. A quiz round is bounded by one
 * class period and one server process; the durable record is what the end path
 * writes to Supabase. Keeping it here means the engine stays synchronous, so
 * an answer is scored in the same tick it arrives — the difference between a
 * quiz that feels like Blooket and one that feels laggy.
 *
 * The timer handle lives beside the session so `stopQuiz` can never leave an
 * orphaned interval firing into a dead room.
 */

import type { VocabQuizSession } from '../services/vocabQuizEngine.js';

interface QuizEntry {
  session: VocabQuizSession;
  timer: ReturnType<typeof setInterval> | null;
}

const quizzes = new Map<string, QuizEntry>();

/**
 * How long a FINISHED quiz keeps answering "this room is mine".
 *
 * Two board-engine guards ask `hasQuizSession` before they touch a room:
 * `teacherControlsHandler.resolveTeacherGame` (so END ROUND reaches the quiz
 * rather than the board's `endGame`) and `gameLifecycle/gameScores` (so the
 * board never writes one zero-word row per student, nor takes the once-per-game
 * `classroom_game_persisted:<code>` key the quiz's own write still needs).
 *
 * `finishQuiz` removes the session FIRST and only then does its awaited
 * persistence, so without this window both guards go dark exactly while the
 * quiz is still working — and the board's empty ending wins the race. That is
 * the 2026-09-05 GHYRVS incident (see `backend/services/vocabQuizRound.ts`)
 * reopened from the inside, and it is what showed a student "0 POINTS" one beat
 * after a live score of 502.
 *
 * Thirty seconds: long enough to cover the persistence round-trip and a
 * teacher's late tap on a control strip that has not repainted yet, short
 * enough that it is gone before any plausible next round — and a board round
 * started in this room clears it outright (`clearQuizFinished`).
 */
export const QUIZ_FINISH_GRACE_MS = 30_000;

/** gameCode → wall clock at which its quiz finished. */
const finishedAt = new Map<string, number>();

export function setQuizSession(gameCode: string, session: VocabQuizSession): void {
  // Replacing an entry must not strand its interval.
  clearQuizTimer(gameCode);
  finishedAt.delete(gameCode);
  quizzes.set(gameCode, { session, timer: null });
}

export function getQuizSession(gameCode: string): VocabQuizSession | undefined {
  return quizzes.get(gameCode)?.session;
}

/**
 * Is this room the quiz's? True for a live round AND for the grace window after
 * one finished — see `QUIZ_FINISH_GRACE_MS`. Callers that need the round itself
 * (scoring, ticking) use `getQuizSession`, which goes empty the instant the
 * round ends.
 */
export function hasQuizSession(gameCode: string): boolean {
  if (quizzes.has(gameCode)) return true;
  const endedAt = finishedAt.get(gameCode);
  if (endedAt === undefined) return false;
  if (Date.now() - endedAt <= QUIZ_FINISH_GRACE_MS) return true;
  // Expired — drop it rather than let the map grow for the life of the process.
  finishedAt.delete(gameCode);
  return false;
}

/**
 * Hand the room back to the board engine now.
 *
 * Called when this room starts something new, so a board round hosted straight
 * after a quiz is never refused its own controls by a window that has not yet
 * elapsed.
 */
export function clearQuizFinished(gameCode: string): void {
  finishedAt.delete(gameCode);
}

export function setQuizTimer(gameCode: string, timer: ReturnType<typeof setInterval>): void {
  const entry = quizzes.get(gameCode);
  if (!entry) {
    // No session to own this handle — drop it rather than leak it.
    clearInterval(timer);
    return;
  }
  if (entry.timer) clearInterval(entry.timer);
  entry.timer = timer;
}

export function clearQuizTimer(gameCode: string): void {
  const entry = quizzes.get(gameCode);
  if (entry?.timer) {
    clearInterval(entry.timer);
    entry.timer = null;
  }
}

export function deleteQuizSession(gameCode: string): void {
  clearQuizTimer(gameCode);
  // Only a room that actually held a quiz opens a grace window — a stray delete
  // must not make the board engine defer to a quiz that never existed.
  if (quizzes.delete(gameCode)) finishedAt.set(gameCode, Date.now());
}

/** Every live quiz code — used by shutdown and by tests. */
export function activeQuizCodes(): string[] {
  return [...quizzes.keys()];
}

export function clearAllQuizSessions(): void {
  for (const code of [...quizzes.keys()]) deleteQuizSession(code);
  // Shutdown and test teardown mean "nothing here at all" — leaving grace
  // windows behind would let one test's finished quiz answer for the next.
  finishedAt.clear();
}
