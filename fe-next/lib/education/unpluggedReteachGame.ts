/**
 * Unplugged reteach — whole-class game state machine (pure, no React, no DOM).
 *
 * The class is ONE team. Each missed word gets a teacher-started reveal
 * countdown; the teacher then judges "class got it" / "not yet" (optionally
 * logging a show-of-hands count). Score + consecutive-word streak climb, and
 * clearing the list is the win.
 *
 * Class-2 guard (stale mutable state across rounds): there is exactly ONE word
 * boundary path — {@link advanceWord}. `judgeWord` scores and then delegates to
 * it, so no outcome branch can forget to clear the timer / reveal / hands.
 *
 * Timing is deadline-based (absolute epoch ms), never a decrementing counter —
 * a projector tab that loses focus throttles intervals and a counter would drift.
 */

/** Teacher-facing reveal-countdown presets. */
export const UNPLUGGED_PRESETS_MS = [20_000, 30_000, 45_000] as const;
export type UnpluggedPresetMs = (typeof UNPLUGGED_PRESETS_MS)[number];

export const UNPLUGGED_DEFAULT_MS: UnpluggedPresetMs = 30_000;

/** Points for a word the class got. */
export const UNPLUGGED_BASE_POINTS = 100;
/** Added per consecutive word, capped at {@link UNPLUGGED_STREAK_CAP} steps. */
export const UNPLUGGED_STREAK_STEP = 20;
export const UNPLUGGED_STREAK_CAP = 5;
/** Judged GOT IT while the started countdown still had time on it. */
export const UNPLUGGED_BEAT_CLOCK_BONUS = 50;
/** Optional show-of-hands: points per raised hand… */
export const UNPLUGGED_HANDS_POINTS = 5;
/** …capped well under the base so scores stay comparable between teachers. */
export const UNPLUGGED_HANDS_BONUS_CAP = 50;
/** Streak at which the mascot catches fire. */
export const UNPLUGGED_FIRE_STREAK = 3;

export type UnpluggedPhase = 'ready' | 'running' | 'revealed' | 'finished';

export interface UnpluggedGameState {
  readonly words: readonly string[];
  readonly phase: UnpluggedPhase;
  readonly index: number;
  /** Selected preset for the reveal countdown. */
  readonly durationMs: number;
  /** Absolute epoch ms the countdown ends at; null unless running. */
  readonly deadline: number | null;
  /** The countdown was started for the CURRENT word. */
  readonly timerRan: boolean;
  /** Revealed with time still on a started clock. */
  readonly beatTheClock: boolean;
  /** Optional show-of-hands count for the current word. */
  readonly hands: number;
  readonly score: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly cleared: number;
  readonly missed: number;
}

function isPreset(ms: number): ms is UnpluggedPresetMs {
  return (UNPLUGGED_PRESETS_MS as readonly number[]).includes(ms);
}

/** Fresh game. Zero words finishes immediately (caller shows the allFound state). */
export function createUnpluggedGame(
  words: readonly string[],
  durationMs: number = UNPLUGGED_DEFAULT_MS,
): UnpluggedGameState {
  const safe = isPreset(durationMs) ? durationMs : UNPLUGGED_DEFAULT_MS;
  return {
    words,
    phase: words.length === 0 ? 'finished' : 'ready',
    index: 0,
    durationMs: safe,
    deadline: null,
    timerRan: false,
    beatTheClock: false,
    hands: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    cleared: 0,
    missed: 0,
  };
}

export function currentWord(state: UnpluggedGameState): string {
  return state.words[state.index] ?? '';
}

/** Preset picker. Ignored mid-countdown so the ring can never jump. */
export function setDuration(state: UnpluggedGameState, durationMs: number): UnpluggedGameState {
  if (state.phase !== 'ready' || !isPreset(durationMs)) return state;
  return { ...state, durationMs };
}

/** One tap arms the countdown for the current word. */
export function startTimer(state: UnpluggedGameState, now: number): UnpluggedGameState {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'running', deadline: now + state.durationMs, timerRan: true };
}

/** Milliseconds left; full duration before the clock is armed, never negative. */
export function remainingMs(state: UnpluggedGameState, now: number): number {
  if (state.phase !== 'running' || state.deadline === null) {
    return state.phase === 'revealed' ? 0 : state.durationMs;
  }
  return Math.max(0, state.deadline - now);
}

/** Timer expiry AND the teacher's early tap both land here. */
export function revealWord(state: UnpluggedGameState, now: number): UnpluggedGameState {
  if (state.phase !== 'ready' && state.phase !== 'running') return state;
  const beatTheClock = state.phase === 'running' && remainingMs(state, now) > 0;
  return { ...state, phase: 'revealed', deadline: null, beatTheClock };
}

/** Optional show-of-hands stepper (clamped 0..99). */
export function bumpHands(state: UnpluggedGameState, delta: number): UnpluggedGameState {
  if (state.phase === 'finished') return state;
  return { ...state, hands: Math.max(0, Math.min(99, state.hands + delta)) };
}

/** Points for a cleared word. `streak` is the streak AFTER the increment. */
export function scoreForWord(input: {
  streak: number;
  beatTheClock: boolean;
  hands: number;
}): number {
  const streakBonus = Math.min(input.streak, UNPLUGGED_STREAK_CAP) * UNPLUGGED_STREAK_STEP;
  const clockBonus = input.beatTheClock ? UNPLUGGED_BEAT_CLOCK_BONUS : 0;
  const handsBonus = Math.min(input.hands * UNPLUGGED_HANDS_POINTS, UNPLUGGED_HANDS_BONUS_CAP);
  return UNPLUGGED_BASE_POINTS + streakBonus + clockBonus + handsBonus;
}

/**
 * THE single word-boundary reset. Everything that must not survive a word lives
 * here; no caller may reset these fields itself.
 */
export function advanceWord(state: UnpluggedGameState): UnpluggedGameState {
  const nextIndex = state.index + 1;
  const done = nextIndex >= state.words.length;
  return {
    ...state,
    index: done ? state.index : nextIndex,
    phase: done ? 'finished' : 'ready',
    deadline: null,
    timerRan: false,
    beatTheClock: false,
    hands: 0,
  };
}

/** "Class got it" / "not yet" — scores, then hands off to {@link advanceWord}. */
export function judgeWord(state: UnpluggedGameState, got: boolean): UnpluggedGameState {
  if (state.phase === 'finished') return state;
  const streak = got ? state.streak + 1 : 0;
  const gained = got
    ? scoreForWord({ streak, beatTheClock: state.beatTheClock, hands: state.hands })
    : 0;
  return advanceWord({
    ...state,
    score: state.score + gained,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    cleared: got ? state.cleared + 1 : state.cleared,
    missed: got ? state.missed : state.missed + 1,
  });
}

/** Every word on the list cleared — the gold end-sticker variant. */
export function isPerfectRun(state: UnpluggedGameState): boolean {
  return (
    state.phase === 'finished' && state.words.length > 0 && state.cleared === state.words.length
  );
}

/** Play again — same list, same chosen preset, scoreboard back to zero. */
export function resetUnpluggedGame(state: UnpluggedGameState): UnpluggedGameState {
  return createUnpluggedGame(state.words, state.durationMs);
}
