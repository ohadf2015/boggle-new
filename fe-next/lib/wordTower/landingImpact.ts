/**
 * Word Tower — landing impact (pure). Tower Bloxx's signature beat: the tower
 * COMPRESSES under a landing block and rebounds with a damped spring, and the
 * block itself squash-stretches on contact. Purely cosmetic — never feeds the
 * verdict or the height math.
 */

/** Total impact window (ms). */
export const IMPACT_MS = 550;
/** How many floors below the landing the compression wave reaches. */
export const IMPACT_DEPTH = 4;
const MAX_DIP_PX = 7;
const OMEGA = (Math.PI * 5) / IMPACT_MS; // ~2.5 rebounds over the window

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Damped-spring dip (px, downward-positive) for the floor `floorDepth` below
 * the landing at `tMs` since contact. Deeper floors feel less of the wave;
 * past {@link IMPACT_DEPTH} it dies entirely.
 */
export function impactDipPx(floorDepth: number, tMs: number, intensity: number): number {
  if (floorDepth >= IMPACT_DEPTH || tMs <= 0 || tMs >= IMPACT_MS) return 0;
  const depthFade = 1 - floorDepth / IMPACT_DEPTH;
  const i = clamp01(intensity);
  const decay = Math.exp((-4 * tMs) / IMPACT_MS);
  return MAX_DIP_PX * i * depthFade * Math.abs(Math.sin(OMEGA * tMs)) * decay;
}

/**
 * Squash-stretch envelope for the landing block — wide + flat on contact
 * (area-preserving: sy = 1/sx), wobbling back to identity by IMPACT_MS.
 */
export function squashScale(tMs: number, intensity: number): { sx: number; sy: number } {
  const k = clamp01(tMs / IMPACT_MS);
  const i = clamp01(intensity);
  const amt = 0.18 * i * (1 - k) * Math.cos(Math.PI * 1.5 * k) ** 2;
  const sx = 1 + amt;
  return { sx, sy: 1 / sx };
}
