/**
 * Word Tower — tower CRASH / topple FX params (pure).
 *
 * When a floor wobbles off the tower it should look + feel like a real collapse,
 * not just a quiet counter tick: a hard screen-shake, a shower of rubble debris,
 * and a dark flash, all scaling with how many floors were lost. This module is
 * the (testable) severity model; the Pixi scene drives the actual particles.
 */

/** Hardest a crash ever shakes (px) — kept above the heaviest clean landing. */
export const CRASH_SHAKE_MAX_PX = 30;
/** Most rubble particles a single collapse spawns. */
export const CRASH_DEBRIS_MAX = 60;
/** Default dark vignette flash colour (deep bruised purple). */
export const CRASH_DARK_COLOR = 0x1a0a14;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export interface CrashFx {
  /** Screen-shake amplitude (px). */
  shakePx: number;
  /** Rubble/debris particle count. */
  debris: number;
  /** Dark-flash opacity (0..1). */
  flashAlpha: number;
  /** Shake + flash duration (s). */
  durationS: number;
  /** Directional shake bias: -1 pulls left, +1 pulls right. */
  biasX: -1 | 1;
  /** Extra rubble chunk particles that tumble and bounce. */
  rubble: number;
  /** Dark vignette / full-screen flash colour. */
  darkColor: number;
}

/**
 * Crash FX for a topple that lost `floorsLost` floors. A topple always costs at
 * least one floor of drama (a 0/negative count is treated as 1), and every
 * channel is clamped so a freak mega-collapse can't break the scene.
 *
 * @param floorsLost - how many floors gave way.
 * @param leanSign - which way the tower is leaning (negative = left, positive = right);
 *                   the shake pulls toward the fall direction.
 * @param darkColor - override the dark flash colour; defaults to CRASH_DARK_COLOR.
 */
export function toppleCrashFx(
  floorsLost: number,
  leanSign: number = 1,
  darkColor: number = CRASH_DARK_COLOR,
): CrashFx {
  const f = Math.max(1, Math.floor(Number.isFinite(floorsLost) ? floorsLost : 1));
  return {
    shakePx: clamp(14 + f * 4, 14, CRASH_SHAKE_MAX_PX),
    debris: Math.round(clamp(18 + f * 9, 18, CRASH_DEBRIS_MAX)),
    rubble: Math.round(clamp(10 + f * 7, 10, 36)),
    flashAlpha: clamp(0.25 + f * 0.08, 0.25, 0.6),
    durationS: clamp(0.45 + f * 0.06, 0.45, 0.85),
    biasX: leanSign < 0 ? -1 : 1,
    darkColor,
  };
}
