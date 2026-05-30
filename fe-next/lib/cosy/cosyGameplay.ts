/**
 * Cosy / Calm Mode — GAMEPLAY tuning (single-player only).
 *
 * Distinct from `cosyPreferences.ts`, whose invariant is "cosy can only reduce
 * VISUAL intensity, never increase it." This module tunes how the game *plays*
 * under calm, and every lever here is deliberately REWARD-NEUTRAL: it must never
 * let the player find more words (which would inflate XP / quests / combo coins).
 * It targets pressure that doesn't gate word-count — opponent pacing and panic
 * cues — so a calm run and a normal run earn identically.
 *
 * Pure on purpose; call sites read it and apply it to their own configs.
 */

/**
 * Calm bot pacing multiplier. Stretches a solo bot's think-time so the player is
 * never *chased*. 1.6× brings hard bots from ~1.8–3.0s to ~2.9–4.8s and easy from
 * ~5–8s to ~8–12.8s: opponents stay present and still score, but the racing
 * sensation is gone. Reward-neutral — bot scores never feed the player's
 * progression.
 */
export const CALM_BOT_PACING_MULTIPLIER = 1.6;

/**
 * Stretch a bot word-finding interval (ms) when calm pacing is active. Identity
 * when not calm, so wiring this in is behaviour-neutral until cosy flips it on.
 */
export function applyCalmBotPacing(intervalMs: number, calm: boolean): number {
  return calm ? Math.round(intervalMs * CALM_BOT_PACING_MULTIPLIER) : intervalMs;
}

export interface CountdownBeepInputs {
  /** Game is running (grid present, not paused/over, time left). */
  gameActive: boolean;
  /** Seconds left on the clock. */
  remainingTime: number;
  /** Cosy's `suppressTimerUrgency` — when true, the timer never shouts. */
  suppressUrgency: boolean;
}

/**
 * Whether the last-10s countdown beep should fire. The urgency-suppressed (cosy)
 * path NEVER beeps — that panic cue is exactly what Calm Mode removes. Pure so the
 * calm contract is testable without rendering the game. Reward-neutral: muting a
 * cue doesn't change how many words the player finds.
 */
export function shouldPlayCountdownBeep({
  gameActive,
  remainingTime,
  suppressUrgency,
}: CountdownBeepInputs): boolean {
  if (suppressUrgency) return false;
  return gameActive && remainingTime <= 10 && remainingTime > 0;
}
