/**
 * mascotState — pure HUD-mascot state machine for Blast Mode.
 *
 * The HUD mascot reacts to gameplay events with one of 10 expressions, gated by
 * two cooldowns: a 4s global cooldown (prevents Clippy-style spam) and a 10s
 * per-state cooldown (no repeat of same pose within 10s). Lifecycle events
 * (wave-clear, wave-fail) bypass cooldowns because the player must always see
 * empathy on loss and acknowledgement on win.
 *
 * All event mappers are pure: easy to unit-test without React, and trivially
 * portable to other modes if the layer proves out.
 *
 * Asset choices come from the existing /public/mascot/*.gif and
 * /public/mascot-new-*.jpg inventory. Animated states use -nobg.gif so the
 * circular HUD frame clips cleanly. Held states use static JPGs to avoid
 * distracting motion when the player is mid-thought.
 */

export type MascotState =
  | 'idle'             // ambient
  | 'focused'          // mid-drag
  | 'cheer'            // 3-5 letter word
  | 'wow'              // 6 letter word
  | 'awe'              // 7+ letter OR 3+ cascade chain
  | 'oh'               // gem letter (Q/Z/X/J) used in word
  | 'nervous'          // <3 moves left
  | 'sad-supportive'   // wave failed (NEVER mocking)
  | 'proud'            // wave cleared
  | 'dancing'          // 3+ wave streak
  | 'unhinged'         // 7+ combo
  | 'exhausted';       // a 3+ combo just broke

/** Asset map. Animated → -nobg.webp (~50% lighter than the .gif twins, plain
 *  <img> so the animation plays); circular clip stays clean. */
export const MASCOT_GIF_PATHS: Record<MascotState, string> = {
  idle: '/mascot-new-main.jpg',
  focused: '/mascot-new-thinking.jpg',
  cheer: '/mascot/celebration.webp',
  wow: '/mascot/mindblown-nobg.webp',
  awe: '/mascot/onfire-nobg.webp',
  oh: '/mascot/powerup-nobg.webp',
  nervous: '/mascot-new-panic.jpg',
  'sad-supportive': '/mascot/crying-nobg.webp',
  proud: '/mascot/trophy-nobg.webp',
  dancing: '/mascot/flexing.webp',
  unhinged: '/mascot/streak-inferno-nobg.webp',
  exhausted: '/mascot/sleepy-nobg.webp',
};


/**
 * How long the HUD mascot stays on screen after a reaction before auto-hiding.
 * The mascot is a transient celebration — it pops in, reacts, and gets out of
 * the way so it never permanently occludes the score/HUD.
 */
export const MASCOT_VISIBLE_MS = 2000;
export const GLOBAL_COOLDOWN_MS = 4000;
export const STATE_COOLDOWN_MS = 10000;

const WORD_LEN_CHEER_MIN = 3;
const WORD_LEN_WOW = 6;
const WORD_LEN_AWE_MIN = 7;
const CASCADE_AWE_MIN = 3;
const STREAK_DANCE_MIN = 3;
const NERVOUS_MOVES_MAX = 2;
const COMBO_DANCE_MIN = 5;
const COMBO_UNHINGED_MIN = 7;
const COMBO_EXHAUST_MIN = 3;

export type ComboTier = 0 | 1 | 2 | 3;

export function comboTier(level: number): ComboTier {
  if (level >= COMBO_UNHINGED_MIN) return 3;
  if (level >= COMBO_DANCE_MIN) return 2;
  if (level >= COMBO_EXHAUST_MIN) return 1;
  return 0;
}

export interface EscalationMotion {
  wiggleDeg: number;
  bounceScale: number;
  periodMs: number;
}

const ESCALATION: Record<ComboTier, EscalationMotion> = {
  0: { wiggleDeg: 0, bounceScale: 1, periodMs: 0 },
  1: { wiggleDeg: 4, bounceScale: 1.04, periodMs: 520 },
  2: { wiggleDeg: 9, bounceScale: 1.08, periodMs: 360 },
  3: { wiggleDeg: 16, bounceScale: 1.14, periodMs: 220 },
};

export function escalationMotion(tier: ComboTier): EscalationMotion {
  return ESCALATION[tier];
}

// ─── Pure event mappers ────────────────────────────────────────────────────────

export function pickMascotStateForWord(input: {
  wordLength: number;
  gemLetterUsed: boolean;
}): MascotState | null {
  const { wordLength, gemLetterUsed } = input;
  if (wordLength < WORD_LEN_CHEER_MIN) return null;
  if (wordLength >= WORD_LEN_AWE_MIN) return 'awe';
  if (gemLetterUsed) return 'oh';
  if (wordLength === WORD_LEN_WOW) return 'wow';
  return 'cheer';
}

export function pickMascotStateForCascade(input: {
  chainDepth: number;
}): MascotState | null {
  return input.chainDepth >= CASCADE_AWE_MIN ? 'awe' : null;
}

export type LifecycleEvent =
  | { kind: 'wave-clear' }
  | { kind: 'wave-fail' }
  | { kind: 'wave-streak'; streakCount: number }
  | { kind: 'low-moves'; movesRemaining: number };

export function pickMascotStateForLifecycle(event: LifecycleEvent): MascotState | null {
  switch (event.kind) {
    case 'wave-clear':
      return 'proud';
    case 'wave-fail':
      return 'sad-supportive';
    case 'wave-streak':
      return event.streakCount >= STREAK_DANCE_MIN ? 'dancing' : null;
    case 'low-moves':
      return event.movesRemaining <= NERVOUS_MOVES_MAX ? 'nervous' : null;
  }
}

// ─── Reducer with cooldowns ────────────────────────────────────────────────────

export interface MascotReducerState {
  current: MascotState;
  /** Wall-clock ms of the last transition (for global cooldown). */
  lastTransitionAt: number;
  /** Wall-clock ms of the last fire-time per state (for state cooldown). */
  perStateLastFiredAt: Partial<Record<MascotState, number>>;
}

export type MascotEvent =
  | { kind: 'word-submitted'; wordLength: number; gemLetterUsed: boolean; word?: string }
  | { kind: 'cascade-detected'; chainDepth: number }
  | { kind: 'wave-clear' }
  | { kind: 'wave-fail' }
  | { kind: 'wave-streak'; streakCount: number }
  | { kind: 'low-moves'; movesRemaining: number }
  | { kind: 'combo-milestone'; level: number }
  | { kind: 'combo-broken'; fromLevel: number }
  | { kind: 'word-rejected' }
  | { kind: 'duplicate-word' }
  | { kind: 'rare-letter'; letter: string }
  | { kind: 'timer-final-10s'; secondsLeft: number }
  | { kind: 'personal-best' };

/**
 * Lifecycle events that bypass cooldown (always show — empathy/acknowledgement).
 */
const BYPASS_COOLDOWN_KINDS: ReadonlySet<MascotEvent['kind']> = new Set([
  'wave-clear',
  'wave-fail',
  'combo-broken',
  'word-rejected',
  'duplicate-word',
]);

function pickStateForEvent(event: MascotEvent): MascotState | null {
  switch (event.kind) {
    case 'word-submitted':
      return pickMascotStateForWord(event);
    case 'cascade-detected':
      return pickMascotStateForCascade(event);
    case 'wave-clear':
    case 'wave-fail':
    case 'wave-streak':
    case 'low-moves':
      return pickMascotStateForLifecycle(event);
    case 'combo-milestone':
      if (event.level >= COMBO_UNHINGED_MIN) return 'unhinged';
      return event.level >= COMBO_DANCE_MIN ? 'dancing' : null;
    case 'combo-broken':
      return event.fromLevel >= COMBO_EXHAUST_MIN ? 'exhausted' : null;
    case 'word-rejected':
      return 'sad-supportive';
    case 'duplicate-word':
      return 'focused';
    case 'rare-letter':
    case 'timer-final-10s':
    case 'personal-best':
      return null;
  }
}

export function reduceMascotEvent(
  state: MascotReducerState,
  event: MascotEvent,
  now: number,
): MascotReducerState {
  const candidate = pickStateForEvent(event);
  if (candidate === null) return state;

  const bypassesCooldown = BYPASS_COOLDOWN_KINDS.has(event.kind);

  if (!bypassesCooldown) {
    // Global cooldown gate — `0` is the sentinel for "never fired" (bypass).
    if (state.lastTransitionAt > 0 && now - state.lastTransitionAt < GLOBAL_COOLDOWN_MS) {
      return state;
    }

    // Per-state cooldown gate
    const lastFired = state.perStateLastFiredAt[candidate];
    if (lastFired != null && now - lastFired < STATE_COOLDOWN_MS) return state;
  }

  return {
    current: candidate,
    lastTransitionAt: now,
    perStateLastFiredAt: { ...state.perStateLastFiredAt, [candidate]: now },
  };
}

export function createInitialMascotState(): MascotReducerState {
  return { current: 'idle', lastTransitionAt: 0, perStateLastFiredAt: {} };
}
