/**
 * mascotState — TDD for the pure HUD-mascot state machine used by Blast.
 * Maps raw gameplay events to a MascotState, applies cooldown gates, returns
 * null when no reaction should fire (cooldown, mute, low-priority event).
 */
import {
  pickMascotStateForWord,
  pickMascotStateForCascade,
  pickMascotStateForLifecycle,
  reduceMascotEvent,
  MASCOT_GIF_PATHS,
  type MascotState,
  type MascotReducerState,
  GLOBAL_COOLDOWN_MS,
  STATE_COOLDOWN_MS,
} from '../mascotState';

describe('mascotState — pure word event mapper', () => {
  it('returns null for words shorter than 4 letters (no reaction)', () => {
    expect(pickMascotStateForWord({ wordLength: 2, gemLetterUsed: false })).toBeNull();
    expect(pickMascotStateForWord({ wordLength: 3, gemLetterUsed: false })).toBeNull();
  });

  it('returns "cheer" for 4-5 letter words', () => {
    expect(pickMascotStateForWord({ wordLength: 4, gemLetterUsed: false })).toBe('cheer');
    expect(pickMascotStateForWord({ wordLength: 5, gemLetterUsed: false })).toBe('cheer');
  });

  it('returns "wow" for 6 letter words', () => {
    expect(pickMascotStateForWord({ wordLength: 6, gemLetterUsed: false })).toBe('wow');
  });

  it('returns "awe" for 7+ letter words', () => {
    expect(pickMascotStateForWord({ wordLength: 7, gemLetterUsed: false })).toBe('awe');
    expect(pickMascotStateForWord({ wordLength: 12, gemLetterUsed: false })).toBe('awe');
  });

  it('upgrades to "oh" when gem letter used regardless of length (≥4)', () => {
    expect(pickMascotStateForWord({ wordLength: 4, gemLetterUsed: true })).toBe('oh');
    expect(pickMascotStateForWord({ wordLength: 5, gemLetterUsed: true })).toBe('oh');
  });

  it('keeps "awe" priority over "oh" for 7+ letter gem words (rare moment wins)', () => {
    expect(pickMascotStateForWord({ wordLength: 7, gemLetterUsed: true })).toBe('awe');
  });

  it('returns null for empty/zero word length', () => {
    expect(pickMascotStateForWord({ wordLength: 0, gemLetterUsed: false })).toBeNull();
  });
});

describe('mascotState — pure cascade event mapper', () => {
  it('returns null for chain depth < 3 (cascade is base feedback, not mascot-worthy)', () => {
    expect(pickMascotStateForCascade({ chainDepth: 0 })).toBeNull();
    expect(pickMascotStateForCascade({ chainDepth: 1 })).toBeNull();
    expect(pickMascotStateForCascade({ chainDepth: 2 })).toBeNull();
  });

  it('returns "awe" for cascade chain depth ≥ 3', () => {
    expect(pickMascotStateForCascade({ chainDepth: 3 })).toBe('awe');
    expect(pickMascotStateForCascade({ chainDepth: 5 })).toBe('awe');
    expect(pickMascotStateForCascade({ chainDepth: 10 })).toBe('awe');
  });
});

describe('mascotState — pure lifecycle event mapper', () => {
  it('returns "proud" on wave-clear', () => {
    expect(pickMascotStateForLifecycle({ kind: 'wave-clear' })).toBe('proud');
  });

  it('returns "sad-supportive" on wave-fail (NEVER mocking)', () => {
    expect(pickMascotStateForLifecycle({ kind: 'wave-fail' })).toBe('sad-supportive');
  });

  it('returns "dancing" on 3-wave streak', () => {
    expect(pickMascotStateForLifecycle({ kind: 'wave-streak', streakCount: 3 })).toBe('dancing');
  });

  it('returns "dancing" on streak counts > 3 too', () => {
    expect(pickMascotStateForLifecycle({ kind: 'wave-streak', streakCount: 5 })).toBe('dancing');
  });

  it('returns null for streakCount < 3', () => {
    expect(pickMascotStateForLifecycle({ kind: 'wave-streak', streakCount: 1 })).toBeNull();
    expect(pickMascotStateForLifecycle({ kind: 'wave-streak', streakCount: 2 })).toBeNull();
  });

  it('returns "nervous" when low-moves event with movesRemaining ≤ 2', () => {
    expect(pickMascotStateForLifecycle({ kind: 'low-moves', movesRemaining: 0 })).toBe('nervous');
    expect(pickMascotStateForLifecycle({ kind: 'low-moves', movesRemaining: 1 })).toBe('nervous');
    expect(pickMascotStateForLifecycle({ kind: 'low-moves', movesRemaining: 2 })).toBe('nervous');
  });

  it('returns null when low-moves with > 2 remaining (not nervous yet)', () => {
    expect(pickMascotStateForLifecycle({ kind: 'low-moves', movesRemaining: 3 })).toBeNull();
  });
});

describe('mascotState — reducer with cooldowns', () => {
  const initial: MascotReducerState = {
    current: 'idle',
    lastTransitionAt: 0,
    perStateLastFiredAt: {},
  };

  it('transitions from idle to cheer when word event lands', () => {
    const next = reduceMascotEvent(initial, {
      kind: 'word-submitted',
      wordLength: 4,
      gemLetterUsed: false,
    }, /* now */ 1000);
    expect(next.current).toBe('cheer');
    expect(next.lastTransitionAt).toBe(1000);
  });

  it('blocks new reaction during global cooldown window (4s)', () => {
    const afterFirst: MascotReducerState = {
      current: 'cheer',
      lastTransitionAt: 1000,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const next = reduceMascotEvent(afterFirst, {
      kind: 'word-submitted',
      wordLength: 6,
      gemLetterUsed: false,
    }, /* now */ 1000 + GLOBAL_COOLDOWN_MS - 100);
    // Still cheer, no transition because we're inside the 4s global cooldown
    expect(next.current).toBe('cheer');
    expect(next.lastTransitionAt).toBe(1000);
  });

  it('allows reaction after global cooldown elapses', () => {
    const afterFirst: MascotReducerState = {
      current: 'cheer',
      lastTransitionAt: 1000,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const next = reduceMascotEvent(afterFirst, {
      kind: 'word-submitted',
      wordLength: 7,
      gemLetterUsed: false,
    }, /* now */ 1000 + GLOBAL_COOLDOWN_MS + 1);
    expect(next.current).toBe('awe');
    expect(next.lastTransitionAt).toBe(1000 + GLOBAL_COOLDOWN_MS + 1);
  });

  it('blocks repeat of SAME state within per-state cooldown (10s) even after global cooldown ok', () => {
    const afterFirst: MascotReducerState = {
      current: 'idle',
      lastTransitionAt: 0,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const justAfterGlobalCooldown = 1000 + GLOBAL_COOLDOWN_MS + 100;
    const next = reduceMascotEvent(afterFirst, {
      kind: 'word-submitted',
      wordLength: 4,
      gemLetterUsed: false,
    }, justAfterGlobalCooldown);
    // Would map to cheer, but cheer fired 5.1s ago, < 10s state cooldown → null/idle
    expect(next.current).toBe('idle');
  });

  it('per-state cooldown does not block a DIFFERENT state from firing', () => {
    const afterFirst: MascotReducerState = {
      current: 'idle',
      lastTransitionAt: 0,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const justAfterGlobalCooldown = 1000 + GLOBAL_COOLDOWN_MS + 100;
    const next = reduceMascotEvent(afterFirst, {
      kind: 'word-submitted',
      wordLength: 7, // → awe, different state
      gemLetterUsed: false,
    }, justAfterGlobalCooldown);
    expect(next.current).toBe('awe');
  });

  it('lifecycle wave-fail bypasses cooldowns (high priority — empathy must always show)', () => {
    const afterFirst: MascotReducerState = {
      current: 'cheer',
      lastTransitionAt: 1000,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const next = reduceMascotEvent(afterFirst, {
      kind: 'wave-fail',
    }, /* now */ 1500);
    // Fail-state always shows; player must see empathy
    expect(next.current).toBe('sad-supportive');
  });

  it('lifecycle wave-clear bypasses cooldowns', () => {
    const afterFirst: MascotReducerState = {
      current: 'cheer',
      lastTransitionAt: 1000,
      perStateLastFiredAt: { cheer: 1000 },
    };
    const next = reduceMascotEvent(afterFirst, {
      kind: 'wave-clear',
    }, /* now */ 1500);
    expect(next.current).toBe('proud');
  });

  it('records perStateLastFiredAt on transition', () => {
    const next = reduceMascotEvent(initial, {
      kind: 'word-submitted',
      wordLength: 7,
      gemLetterUsed: false,
    }, /* now */ 5000);
    expect(next.perStateLastFiredAt.awe).toBe(5000);
  });

  it('gracefully handles cascade event during cooldown — no transition', () => {
    const afterFirst: MascotReducerState = {
      current: 'awe',
      lastTransitionAt: 1000,
      perStateLastFiredAt: { awe: 1000 },
    };
    const next = reduceMascotEvent(afterFirst, {
      kind: 'cascade-detected',
      chainDepth: 4,
    }, /* now */ 2000); // 1s later — global cooldown blocks
    expect(next.current).toBe('awe');
    expect(next.lastTransitionAt).toBe(1000); // unchanged
  });
});

describe('mascotState — asset registry', () => {
  it('exposes a path for every MascotState (no missing GIFs/JPGs)', () => {
    const states: MascotState[] = [
      'idle', 'focused', 'cheer', 'wow', 'awe', 'oh',
      'nervous', 'sad-supportive', 'proud', 'dancing',
    ];
    for (const state of states) {
      expect(MASCOT_GIF_PATHS[state]).toMatch(/^\/(mascot|mascot-new-)/);
    }
  });

  it('uses transparent -nobg clips for animated states (clean circle clip)', () => {
    expect(MASCOT_GIF_PATHS['wow']).toContain('-nobg.webp');
    expect(MASCOT_GIF_PATHS['oh']).toContain('-nobg.webp');
    expect(MASCOT_GIF_PATHS['sad-supportive']).toContain('-nobg.webp');
    expect(MASCOT_GIF_PATHS['proud']).toContain('-nobg.webp');
  });
});

describe('mascotState — cooldown constants', () => {
  it('GLOBAL_COOLDOWN_MS is 4 seconds (research-backed: prevents Clippy fatigue)', () => {
    expect(GLOBAL_COOLDOWN_MS).toBe(4000);
  });

  it('STATE_COOLDOWN_MS is 10 seconds (no same pose within 10s)', () => {
    expect(STATE_COOLDOWN_MS).toBe(10000);
  });
});
