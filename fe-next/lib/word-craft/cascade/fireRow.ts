export interface FireState {
  fireRow: number;
  totalRows: number;
  riseEveryMs: number;
  elapsedSinceRiseMs: number;
  /** Milliseconds of "wall time" during which fire is paused. */
  frozenUntilMs: number;
}

export interface CreateFireStateOpts {
  totalRows: number;
  riseEveryMs: number;
}

export function createFireState(opts: CreateFireStateOpts): FireState {
  return {
    fireRow: 0,
    totalRows: opts.totalRows,
    riseEveryMs: opts.riseEveryMs,
    elapsedSinceRiseMs: 0,
    frozenUntilMs: 0,
  };
}

/**
 * Advance the fire ticker by `deltaMs`. Honors frost pauses: while
 * `frozenUntilMs` has time left, fire does not rise; partial overlap is
 * supported (only the unfrozen portion counts).
 */
export function tickFire(state: FireState, deltaMs: number): FireState {
  if (deltaMs <= 0) return state;

  let frozenUntilMs = state.frozenUntilMs;
  let consumable = deltaMs;
  if (frozenUntilMs > 0) {
    const used = Math.min(frozenUntilMs, deltaMs);
    frozenUntilMs -= used;
    consumable -= used;
    if (consumable <= 0) {
      return { ...state, frozenUntilMs };
    }
  }

  const totalElapsed = state.elapsedSinceRiseMs + consumable;
  const rises = Math.floor(totalElapsed / state.riseEveryMs);
  const remainder = totalElapsed - rises * state.riseEveryMs;
  const fireRow = Math.min(state.totalRows, state.fireRow + rises);

  return {
    ...state,
    fireRow,
    elapsedSinceRiseMs: remainder,
    frozenUntilMs,
  };
}

export function resetFire(state: FireState, rowsToPushDown: number): FireState {
  const fireRow = Math.max(0, state.fireRow - rowsToPushDown);
  return { ...state, fireRow };
}

export function isGameOver(state: FireState): boolean {
  return state.fireRow >= state.totalRows;
}

/**
 * Frost cards extend the frozen window. Stacks additively with whatever
 * remaining frost time is already on the clock.
 */
export function applyFrostPause(state: FireState, durationMs: number): FireState {
  return { ...state, frozenUntilMs: state.frozenUntilMs + Math.max(0, durationMs) };
}
