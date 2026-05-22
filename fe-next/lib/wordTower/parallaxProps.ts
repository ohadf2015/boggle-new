/**
 * Word Tower — altitude-anchored parallax props (pure, renderer-agnostic).
 *
 * Floating "height reference" objects (balloon → birds → plane → satellite →
 * UFO) that descend past the climber as they ascend, selling progress (founder:
 * "more references to the height of the tower… parallax to feel progress").
 *
 * Each prop is anchored to an altitude `atM`. Its vertical screen offset is
 * `(heightM − atM) × PX_PER_M × depth`: below the anchor it sits high in the
 * sky (negative offset), at the anchor it rests, and once climbed past it slides
 * off the bottom (positive). It is only "active" (→ mounted + image loaded) while
 * `heightM` is within `rangeM` of the anchor — that single window is both the
 * lazy-load gate and the parallax range.
 */

export interface ParallaxProp {
  id: string;
  /** Public image path (transparent PNG). */
  src: string;
  /** Altitude (m) at which the prop rests at `topPct`. */
  atM: number;
  /** Resting vertical anchor, % from the top. */
  topPct: number;
  /** Horizontal anchor, % from the left. */
  xPct: number;
  /** Rendered width (px). */
  width: number;
  /** Parallax multiplier — <1 drifts slowly (far), >1 streaks (near). */
  depth: number;
  /** Half-window (m) of climb the prop stays mounted around its anchor. */
  rangeM: number;
}

export interface ActiveParallaxProp extends ParallaxProp {
  /** Vertical parallax offset (px) to apply on top of `topPct`. */
  offsetPx: number;
  /** Eased opacity (fades in/out at the window edges). */
  opacity: number;
}

/** Screen px of parallax travel per metre climbed (matches WordTowerBackdrop). */
export const PROP_PX_PER_M = 5.2;

/** The climb's prop set, spread across the altitude bands. */
export const WORD_TOWER_PROPS: ParallaxProp[] = [
  { id: 'balloon',   src: '/images/word-tower/wt-balloon.png',   atM: 30,  topPct: 30, xPct: 16, width: 92,  depth: 1.05, rangeM: 70 },
  { id: 'birds',     src: '/images/word-tower/wt-birds.png',     atM: 70,  topPct: 22, xPct: 68, width: 110, depth: 0.9,  rangeM: 80 },
  { id: 'plane',     src: '/images/word-tower/wt-plane.png',     atM: 140, topPct: 34, xPct: 22, width: 124, depth: 1.1,  rangeM: 95 },
  { id: 'satellite', src: '/images/word-tower/wt-satellite.png', atM: 300, topPct: 26, xPct: 70, width: 104, depth: 0.7,  rangeM: 120 },
  { id: 'ufo',       src: '/images/word-tower/wt-ufo.png',       atM: 600, topPct: 24, xPct: 30, width: 126, depth: 0.85, rangeM: 170 },
];

/**
 * Props currently within their altitude window, with parallax offset + fade.
 * Anything outside its window is omitted — the caller renders only these, so
 * images mount (and load) lazily on approach and unmount once passed.
 */
export function visiblePropsAt(
  heightM: number,
  props: ReadonlyArray<ParallaxProp> = WORD_TOWER_PROPS,
  pxPerM: number = PROP_PX_PER_M,
): ActiveParallaxProp[] {
  const out: ActiveParallaxProp[] = [];
  for (const p of props) {
    const dm = heightM - p.atM;
    if (Math.abs(dm) > p.rangeM) continue; // outside window → not mounted
    const offsetPx = dm * pxPerM * p.depth;
    const edge = 1 - Math.abs(dm) / p.rangeM; // 1 at anchor → 0 at the edge
    const opacity = Math.max(0, Math.min(1, edge * 1.8)); // plateau in the middle
    out.push({ ...p, offsetPx, opacity });
  }
  return out;
}
