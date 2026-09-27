/**
 * Word Tower — impact punch (pure). Perfect drops / clutch saves land with a
 * micro zoom-punch + golden flash: the hitstop FEEL without rescaling time
 * (the scene's sway is phase-locked to the absolute clock, so real time
 * dilation would desync the crane and the tower). Cosmetic only.
 */

/** Zoom-punch window (ms) — long enough to read as hitstop without freezing the clock. */
export const PUNCH_MS = 300;
/** Peak scale boost (0.07 → ~7%) — was 0.04 (too micro for "nailed it"). */
export const MAX_PUNCH = 0.07;
/** Floor scale for a negative (miss) shrink punch so the tower never disappears. */
export const MIN_PUNCH_SCALE = 0.96;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Tower scale at `tMs` since the punch — snaps in, eases back to 1.
 *  Positive intensity zooms OUT (success hitstop). Negative intensity zooms
 *  IN (miss/impact shrink). The colour flash half of the beat is the scene's
 *  existing engine.flash. */
export function punchScaleAt(tMs: number, intensity: number): number {
  const k = clamp01(tMs / PUNCH_MS);
  const i = Math.max(-1, Math.min(1, intensity));
  if (i === 0 || k === 0 || k === 1) return 1;
  const curve = Math.sin(Math.PI * Math.pow(k, 0.55)) * (1 - k * 0.4);
  if (i > 0) {
    return 1 + MAX_PUNCH * i * curve;
  }
  // Negative intensity: a brief shrink/impact feel, clamped so the tower stays visible.
  return Math.max(MIN_PUNCH_SCALE, 1 + MAX_PUNCH * i * curve * 0.85);
}
