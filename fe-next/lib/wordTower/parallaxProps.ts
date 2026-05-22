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

/**
 * The climb's prop set, spread densely across the altitude bands with variety —
 * alternating sides, varied depth (0.6 far → 1.15 near) and size, so the ascent
 * always has one or two different references gliding past. Ground→space:
 * kite · balloon · drone · birds · paraglider · plane · helicopter · satellite ·
 * rocket · astronaut · UFO · comet · ringed planet.
 */
export const WORD_TOWER_PROPS: ParallaxProp[] = [
  { id: 'kite',        src: '/images/word-tower/wt-kite.png',        atM: 16,  topPct: 28, xPct: 74, width: 80,  depth: 1.1,  rangeM: 60 },
  { id: 'balloon',     src: '/images/word-tower/wt-balloon.png',     atM: 32,  topPct: 30, xPct: 16, width: 92,  depth: 1.05, rangeM: 64 },
  { id: 'drone',       src: '/images/word-tower/wt-drone.png',       atM: 54,  topPct: 20, xPct: 60, width: 84,  depth: 1.15, rangeM: 60 },
  { id: 'birds',       src: '/images/word-tower/wt-birds.png',       atM: 78,  topPct: 22, xPct: 28, width: 110, depth: 0.9,  rangeM: 70 },
  { id: 'paraglider',  src: '/images/word-tower/wt-paraglider.png',  atM: 104, topPct: 32, xPct: 72, width: 110, depth: 1.0,  rangeM: 76 },
  { id: 'plane',       src: '/images/word-tower/wt-plane.png',       atM: 138, topPct: 36, xPct: 20, width: 124, depth: 1.1,  rangeM: 85 },
  { id: 'helicopter',  src: '/images/word-tower/wt-helicopter.png',  atM: 184, topPct: 24, xPct: 66, width: 116, depth: 1.05, rangeM: 88 },
  { id: 'satellite',   src: '/images/word-tower/wt-satellite.png',   atM: 256, topPct: 26, xPct: 24, width: 104, depth: 0.7,  rangeM: 110 },
  { id: 'rocket',      src: '/images/word-tower/wt-rocket.png',      atM: 360, topPct: 30, xPct: 70, width: 120, depth: 0.95, rangeM: 120 },
  { id: 'astronaut',   src: '/images/word-tower/wt-astronaut.png',   atM: 472, topPct: 22, xPct: 28, width: 100, depth: 0.8,  rangeM: 124 },
  { id: 'ufo',         src: '/images/word-tower/wt-ufo.png',         atM: 600, topPct: 24, xPct: 66, width: 126, depth: 0.85, rangeM: 150 },
  { id: 'comet',       src: '/images/word-tower/wt-comet.png',       atM: 770, topPct: 18, xPct: 30, width: 130, depth: 1.0,  rangeM: 160 },
  { id: 'planetRing',  src: '/images/word-tower/wt-planet-ring.png', atM: 950, topPct: 26, xPct: 68, width: 142, depth: 0.6,  rangeM: 200 },
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
