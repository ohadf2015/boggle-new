/**
 * Word Tower — impact punch (pure). Perfect drops / clutch saves land with a
 * micro zoom-punch + golden flash: the hitstop FEEL without rescaling time
 * (the scene's sway is phase-locked to the absolute clock, so real time
 * dilation would desync the crane and the tower). Cosmetic only.
 */

/** Zoom-punch window (ms). */
export const PUNCH_MS = 260;
const MAX_PUNCH = 0.04;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Tower scale at `tMs` since the punch — snaps in, eases back to 1.
 *  (The colour flash half of the beat is the scene's existing engine.flash.) */
export function punchScaleAt(tMs: number, intensity: number): number {
  const k = clamp01(tMs / PUNCH_MS);
  const i = clamp01(intensity);
  if (i === 0 || k === 0 || k === 1) return 1;
  return 1 + MAX_PUNCH * i * Math.sin(Math.PI * Math.pow(k, 0.55)) * (1 - k * 0.4);
}
