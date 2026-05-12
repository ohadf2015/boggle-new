/**
 * Pulse Ring Curve — pure time-based tween math for the combo pulse ring.
 *
 * Split out from the PixiJS Graphics render glue so the curve is unit-testable
 * without spinning up a WebGL canvas. `BlastEffectsCanvas` drives this per-frame
 * and applies the resulting {scale, alpha} to a Graphics ring with a GlowFilter.
 *
 * Design: ease-out cubic on scale (fast pop → gentle settle), linear on alpha
 * (predictable fade). Start scale is 0.2 so the ring visibly "births" from a
 * small dot; end scale is ~2.0 so it clears beyond the origin cell.
 */

// Neo-brutalist palette hex literals — duplicated from pixiFilterPresets.ts
// (which keeps them private). Inlining keeps this pure-math helper free of
// WebGL/filter dependencies so it stays unit-testable in jsdom.
const NEO_LIME = 0xbfff00;
const NEO_PINK = 0xff1493;
const NEO_CYAN = 0x00ffff;

const START_SCALE = 0.2;
const END_SCALE = 2.0;

export interface PulseRingFrame {
  /** Uniform scale multiplier to apply to the ring Graphics (x and y). */
  scale: number;
  /** Opacity 0..1 to apply to the ring Graphics. */
  alpha: number;
  /** True once the tween has reached its end state and the ring can be destroyed. */
  done: boolean;
}

/**
 * Compute the ring's scale/alpha at normalized time `t` in [0, 1].
 * Values outside the range are clamped (no extrapolation) so callers can pass
 * raw `elapsed / duration` without pre-clamping.
 */
export function computePulseRingFrame(tRaw: number): PulseRingFrame {
  const t = Math.max(0, Math.min(1, tRaw));
  // Ease-out cubic: 1 - (1 - t)^3 — fast initial growth, gentle tail.
  const eased = 1 - Math.pow(1 - t, 3);
  const scale = START_SCALE + (END_SCALE - START_SCALE) * eased;
  const alpha = 1 - t;
  return { scale, alpha, done: t >= 1 };
}

/**
 * Map a combo tier to the ring's glow color. Escalates lime → pink → cyan so
 * players perceive rising intensity even through the scale/alpha motion.
 */
export function pulseRingTierColor(tier: number): number {
  if (tier <= 1) return NEO_LIME;
  if (tier < 5) return NEO_PINK;
  return NEO_CYAN;
}
