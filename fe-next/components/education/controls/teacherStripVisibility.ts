/**
 * "Is a classroom round running, and should the teacher's strip be on screen?"
 *
 * Pure, so the answer can be tested without a socket, a store or a projector.
 *
 * BACKGROUND — the bug this replaces. The multiplayer shell used to gate the
 * strip on the Zustand `gameActive` flag. That flag is written only on the
 * PLAYER socket path (`usePlayerGameEvents`); the host computes its own
 * round-active expression inside `HostView` and never writes the store. The
 * teacher is always the host, so the flag stayed false for the entire round and
 * the strip never rendered — recurring-pitfall Class 3, two paths that should
 * behave identically where only the untested one diverges.
 *
 * The signal here is the server's own round traffic, which every role receives:
 * `startGame` / `timeUpdate` / `endGame` / `resetGame` for the board modes and
 * the `vocabQuiz:*` events for the quiz, which is not a `GameMode` and so
 * cannot be recognised from the room's mode at all.
 */

import type { VocabQuizPhase } from '@/shared/types/vocabQuiz';

export interface RoundSignalState {
  /** A board round (classic / word-hunt / blast / wheel-rush) is running. */
  boardRound: boolean;
  /** A live Vocab Quiz owns this room — a different clock and a different end path. */
  quizRound: boolean;
  /**
   * The quiz's own pause. The board's pause lands in `useTeacherPause` via
   * `gamePaused`; a quiz pause broadcasts `vocabQuiz:paused` and touches
   * nothing else, so without this the teacher freezes the class and the button
   * still reads "Pause" with no way back to Resume.
   */
  quizPaused: boolean;
}

export const IDLE_ROUND_STATE: RoundSignalState = {
  boardRound: false,
  quizRound: false,
  quizPaused: false,
};

export type RoundSignal =
  | { type: 'boardStart' }
  | { type: 'boardTick'; remainingTime?: number | null }
  | { type: 'boardEnd' }
  | { type: 'boardReset' }
  | { type: 'quizQuestion' }
  | { type: 'quizSnapshot'; phase: VocabQuizPhase; paused: boolean }
  | { type: 'quizPaused'; paused: boolean }
  | { type: 'quizEnded' };

export function reduceRoundSignal(state: RoundSignalState, signal: RoundSignal): RoundSignalState {
  switch (signal.type) {
    case 'boardStart':
      return { ...state, boardRound: true };

    // Self-heal: a teacher who reloads mid-round missed `startGame`, but the
    // clock keeps arriving every second. `0` is NOT a running round — the timer
    // reports zero on the way out, before `endGame` lands.
    case 'boardTick':
      return typeof signal.remainingTime === 'number' && signal.remainingTime > 0
        ? { ...state, boardRound: true }
        : state;

    case 'boardEnd':
    case 'boardReset':
      return { ...state, boardRound: false };

    case 'quizQuestion':
      return { ...state, quizRound: true };

    // The reconnect snapshot answers for every phase, including "it's over" —
    // taking it as proof of a live round would park the strip on the standings.
    case 'quizSnapshot':
      return signal.phase === 'ended'
        ? { ...state, quizRound: false, quizPaused: false }
        : { ...state, quizRound: true, quizPaused: signal.paused };

    case 'quizPaused':
      return { ...state, quizPaused: signal.paused };

    case 'quizEnded':
      return { ...state, quizRound: false, quizPaused: false };

    default:
      return state;
  }
}

export function isRoundLive(state: RoundSignalState): boolean {
  return state.boardRound || state.quizRound;
}

export interface TeacherStripVisibilityInput {
  /** The shell has a room (the host is past the join screen). */
  isActive: boolean;
  isHost: boolean;
  isClassroomMode: boolean;
  showResults: boolean;
  roundLive: boolean;
}

export function shouldShowTeacherStrip({
  isActive,
  isHost,
  isClassroomMode,
  showResults,
  roundLive,
}: TeacherStripVisibilityInput): boolean {
  return isActive && isHost && isClassroomMode && !showResults && roundLive;
}
