/**
 * Deterministic jagged polyline for the electric strike from hub → mode node.
 * Pure math — unit-testable without a browser.
 */

export type Pt = { x: number; y: number };

/** Simple LCG so the same mode always gets the same zig (no SSR flicker). */
function seeded(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Build an SVG polyline points string from center → target with mid-segment
 * jitter perpendicular to the strike direction (lightning zig-zag).
 */
export function lightningPolyline(
  from: Pt,
  to: Pt,
  opts: { segments?: number; jitter?: number; seed?: number } = {}
): string {
  const segments = Math.max(2, opts.segments ?? 7);
  const jitter = opts.jitter ?? 10;
  const rand = seeded(opts.seed ?? 1);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // Unit perpendicular
  const px = -dy / len;
  const py = dx / len;

  const pts: Pt[] = [from];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    // Ease slightly so zig is denser mid-bolt
    const midBoost = 1 - Math.abs(t - 0.5) * 1.2;
    const j = (rand() * 2 - 1) * jitter * midBoost;
    pts.push({
      x: from.x + dx * t + px * j,
      y: from.y + dy * t + py * j,
    });
  }
  pts.push(to);
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** Minimum time the strike + loading hold stays on screen before entering play. */
export const STRIKE_HOLD_MS = 900;
export const STRIKE_HOLD_REDUCED_MS = 220;

export function strikeHoldMs(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? STRIKE_HOLD_REDUCED_MS : STRIKE_HOLD_MS;
}
