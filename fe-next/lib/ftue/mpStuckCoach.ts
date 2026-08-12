/**
 * Pure decision function for the multiplayer "stuck player" coach.
 *
 * Classic MP players who don't understand what to do produce a few distinct,
 * observable signals. This function maps a snapshot of those signals to AT MOST
 * ONE piece of help — the single arbiter that prevents popups from stacking and
 * guarantees we never tutorialize a competent player.
 *
 * It is intentionally pure (no React, no DOM, no clock) so the "thoughtful pause
 * vs. fruitless fiddle" discriminator can be pinned down with unit tests.
 */

export type StuckStage =
  | 'none'
  | 'idle-nudge' // no interaction at all → teach the core gesture
  | 'tap-hint' // tapping single tiles, never dragging (mobile only)
  | 'submit-hint' // building paths but never submitting them
  | 'validity-hint'; // submitting words but none are valid

export interface StuckSignals {
  /** ms since the grid became interactive this game. */
  elapsedMs: number;
  /** ms since the last interaction of ANY kind (tap, drag, submit). */
  idleMs: number;
  /** single-tap-no-drag count (taps that released on one tile). */
  taps: number;
  /** number of path selections begun (a real word started forming). */
  dragsStarted: number;
  /** words submitted to the server, regardless of result. */
  submits: number;
  /** accepted (valid) words this game. */
  accepted: number;
  /** lifetime games played — used to suppress help for veterans. */
  totalGamesPlayed: number;
  /** desktop/mouse session — suppresses the touch-only tap-hint. */
  isDesktop: boolean;
  /** the coach already showed (this game or in a prior session). */
  alreadyShown: boolean;
}

// Tunable thresholds. Exported so tests and the arbiter share one source of truth.
export const IDLE_MS = 12000; // dead-still this long with zero actions → nudge
export const FRUITLESS_MS = 15000; // interacting this long with zero success → help
export const TAP_MIN = 3; // taps-without-drag before we assume confusion
export const DRAG_MIN = 2; // paths begun before "you forgot to submit" help
export const SUBMIT_MIN = 2; // junk submits before "spell a real word" help
export const VETERAN_GAMES = 1; // > this many games played ⇒ no tutorialising

export function nextStuckStage(s: StuckSignals): StuckStage {
  // --- Gates (cheapest, highest-confidence reasons to stay silent) ----------
  // Scored at least once → they get it. Get out of the way for the rest of the
  // game. This is also the "thoughtful pause" guard: a player who paused after
  // scoring is competent, not confused.
  if (s.accepted > 0) return 'none';
  // One-shot: never re-show within a game or across sessions.
  if (s.alreadyShown) return 'none';
  // Never tutorialise an experienced player who simply paused to scan the board.
  if (s.totalGamesPlayed > VETERAN_GAMES) return 'none';

  // --- Stage detection (priority: most-specific confusion first) ------------
  // Submitting words but nothing lands → they don't know the validity rules.
  if (s.submits >= SUBMIT_MIN && s.accepted === 0 && s.elapsedMs >= FRUITLESS_MS) {
    return 'validity-hint';
  }
  // Building paths but never submitting → they don't know how to commit a word.
  if (s.submits === 0 && s.dragsStarted >= DRAG_MIN && s.elapsedMs >= FRUITLESS_MS) {
    return 'submit-hint';
  }
  // Poking single tiles, never dragging → teach the drag gesture (touch only).
  if (
    !s.isDesktop &&
    s.taps >= TAP_MIN &&
    s.dragsStarted === 0 &&
    s.submits === 0
  ) {
    return 'tap-hint';
  }
  // Frozen — no action of any kind for a while → gentle "drag to spell" nudge.
  if (
    s.idleMs >= IDLE_MS &&
    s.taps === 0 &&
    s.dragsStarted === 0 &&
    s.submits === 0
  ) {
    return 'idle-nudge';
  }

  return 'none';
}

// ---------------------------------------------------------------------------
// Concrete example word
//
// The coach copy alone is abstract ("drag across letters to spell a word") and
// 70% of the 125 players who saw the idle nudge in 30 days ignored it — only
// 17% of stuck players were helped overall. A player who has gone 60s without a
// single word does not need the gesture explained; they need to be shown a word
// that is actually on their board. These pick the word and decide when it helps.
// ---------------------------------------------------------------------------

/** Long enough to feel like a word, short enough to trace while being watched. */
const EXAMPLE_MIN_LEN = 3;
const EXAMPLE_MAX_LEN = 5;

export interface SolvedGridWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

/**
 * Pick one demonstrable word from a solved grid — easiest bucket first, since
 * the reader is by definition failing at this.
 */
export function pickCoachExampleWord(words: SolvedGridWords | null | undefined): string | null {
  if (!words) return null;
  for (const bucket of [words.easy, words.medium, words.hard]) {
    const usable = (bucket ?? []).filter(
      (w) => w.length >= EXAMPLE_MIN_LEN && w.length <= EXAMPLE_MAX_LEN,
    );
    // Shortest first: the drag diagram only traces three tiles, so a 3-letter
    // word makes the picture and the "Try: X" caption show the same thing.
    if (usable.length) {
      return usable.reduce((best, w) => (w.length < best.length ? w : best));
    }
  }
  return null;
}

/**
 * `submit-hint` is excluded on purpose: that player already built a valid path,
 * so they understand the board. Their problem is committing the word, and
 * showing a different word would talk past it.
 */
export function stageWantsExampleWord(stage: StuckStage): boolean {
  return stage === 'idle-nudge' || stage === 'tap-hint' || stage === 'validity-hint';
}
