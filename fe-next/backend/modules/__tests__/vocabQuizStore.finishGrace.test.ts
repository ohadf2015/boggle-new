/**
 * Live Vocab Quiz — the guards must outlive the session they guard.
 *
 * Two board-engine paths ask `hasQuizSession` before they touch a room:
 * `teacherControlsHandler.resolveTeacherGame` (so "End round now" reaches the
 * quiz instead of the board) and `gameLifecycle/gameScores` (so the board's end
 * path does not write one zero-word row per student and take the once-per-game
 * `classroom_game_persisted:<code>` key).
 *
 * `finishQuiz` deletes the session FIRST and only then does its own awaited
 * persistence. Between those two moments both guards answered "no quiz here",
 * so anything reaching the board in that window — a teacher tapping END ROUND
 * one beat after the last question, a watchdog, a reconnect — got the board's
 * empty ending and, worse, took the idempotency key the quiz's real write still
 * needed. That is the 2026-09-05 GHYRVS incident (documented in the header of
 * `backend/services/vocabQuizRound.ts`) reopened from the inside.
 *
 * So a finished quiz keeps answering for its room for a short grace window.
 * `getQuizSession` still goes empty immediately — the round really is over, and
 * nothing should be able to score into it — but the room stays the quiz's.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  setQuizSession,
  getQuizSession,
  hasQuizSession,
  deleteQuizSession,
  clearQuizFinished,
  clearAllQuizSessions,
  QUIZ_FINISH_GRACE_MS,
} from '../vocabQuizStore';
import type { VocabQuizSession } from '../../services/vocabQuizEngine';

const session = (gameCode: string) => ({ gameCode, questions: [] } as unknown as VocabQuizSession);

afterEach(() => {
  clearAllQuizSessions();
  vi.useRealTimers();
});

describe('vocabQuizStore — the finish grace window', () => {
  it('still owns the room for the board guards right after the quiz ends', () => {
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');

    expect(hasQuizSession('AAA111')).toBe(true);
  });

  it('empties the session immediately — the round is genuinely over', () => {
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');

    expect(getQuizSession('AAA111')).toBeUndefined();
  });

  it('lets go once the window has passed', () => {
    vi.useFakeTimers();
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');
    vi.advanceTimersByTime(QUIZ_FINISH_GRACE_MS + 1_000);

    expect(hasQuizSession('AAA111')).toBe(false);
  });

  it('never claims a room that never ran a quiz', () => {
    expect(hasQuizSession('ZZZ999')).toBe(false);
  });

  it('lets go the moment the same room starts something new', () => {
    // A board round hosted straight after a quiz must not find END ROUND
    // deferred to a quiz that finished thirty seconds ago.
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');
    clearQuizFinished('AAA111');

    expect(hasQuizSession('AAA111')).toBe(false);
  });

  it('lets go when a fresh quiz takes the same room', () => {
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');
    clearQuizFinished('AAA111');

    expect(hasQuizSession('AAA111')).toBe(false);
  });

  it('wipes the window along with the sessions, so tests stay isolated', () => {
    setQuizSession('AAA111', session('AAA111'));
    deleteQuizSession('AAA111');
    clearAllQuizSessions();

    expect(hasQuizSession('AAA111')).toBe(false);
  });
});
