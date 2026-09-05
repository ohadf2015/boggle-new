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

export function setQuizSession(gameCode: string, session: VocabQuizSession): void {
  // Replacing an entry must not strand its interval.
  clearQuizTimer(gameCode);
  quizzes.set(gameCode, { session, timer: null });
}

export function getQuizSession(gameCode: string): VocabQuizSession | undefined {
  return quizzes.get(gameCode)?.session;
}

export function hasQuizSession(gameCode: string): boolean {
  return quizzes.has(gameCode);
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
  quizzes.delete(gameCode);
}

/** Every live quiz code — used by shutdown and by tests. */
export function activeQuizCodes(): string[] {
  return [...quizzes.keys()];
}

export function clearAllQuizSessions(): void {
  for (const code of [...quizzes.keys()]) deleteQuizSession(code);
}
