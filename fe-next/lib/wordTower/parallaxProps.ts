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
  // Spread with BIG, growing height gaps and tight ranges, so each reference
  // appears distinctly (clear empty sky between them) — a sense of real
  // altitude jumps rather than a crowded conveyor belt.
  { id: 'kite',        src: '/images/word-tower/wt-kite.png',        atM: 22,   topPct: 28, xPct: 74, width: 80,  depth: 1.1,  rangeM: 28 },
  { id: 'balloon',     src: '/images/word-tower/wt-balloon.png',     atM: 60,   topPct: 30, xPct: 16, width: 92,  depth: 1.05, rangeM: 32 },
  { id: 'drone',       src: '/images/word-tower/wt-drone.png',       atM: 110,  topPct: 20, xPct: 62, width: 84,  depth: 1.15, rangeM: 38 },
  { id: 'birds',       src: '/images/word-tower/wt-birds.png',       atM: 175,  topPct: 22, xPct: 28, width: 110, depth: 0.9,  rangeM: 44 },
  { id: 'paraglider',  src: '/images/word-tower/wt-paraglider.png',  atM: 255,  topPct: 32, xPct: 70, width: 110, depth: 1.0,  rangeM: 50 },
  { id: 'plane',       src: '/images/word-tower/wt-plane.png',       atM: 350,  topPct: 36, xPct: 22, width: 124, depth: 1.1,  rangeM: 58 },
  { id: 'helicopter',  src: '/images/word-tower/wt-helicopter.png',  atM: 470,  topPct: 24, xPct: 66, width: 116, depth: 1.05, rangeM: 66 },
  { id: 'satellite',   src: '/images/word-tower/wt-satellite.png',   atM: 620,  topPct: 26, xPct: 26, width: 104, depth: 0.7,  rangeM: 80 },
  { id: 'rocket',      src: '/images/word-tower/wt-rocket.png',      atM: 800,  topPct: 30, xPct: 70, width: 120, depth: 0.95, rangeM: 95 },
  { id: 'astronaut',   src: '/images/word-tower/wt-astronaut.png',   atM: 1010, topPct: 22, xPct: 28, width: 100, depth: 0.8,  rangeM: 110 },
  { id: 'ufo',         src: '/images/word-tower/wt-ufo.png',         atM: 1260, topPct: 24, xPct: 66, width: 126, depth: 0.85, rangeM: 130 },
  { id: 'comet',       src: '/images/word-tower/wt-comet.png',       atM: 1560, topPct: 18, xPct: 30, width: 130, depth: 1.0,  rangeM: 150 },
  { id: 'planetRing',  src: '/images/word-tower/wt-planet-ring.png', atM: 1900, topPct: 26, xPct: 68, width: 142, depth: 0.6,  rangeM: 180 },
  // Funny surprises — unexpected sights at altitude (cow in space, a flying toaster).
  { id: 'duck',       src: '/images/word-tower/wt-duck.png',       atM: 300,  topPct: 30, xPct: 22, width: 96,  depth: 1.0,  rangeM: 40 },
  { id: 'pizza',      src: '/images/word-tower/wt-pizza.png',      atM: 700,  topPct: 22, xPct: 70, width: 100, depth: 1.05, rangeM: 70 },
  { id: 'cow',        src: '/images/word-tower/wt-cow.png',        atM: 1130, topPct: 26, xPct: 28, width: 112, depth: 0.9,  rangeM: 110 },
  { id: 'toaster',    src: '/images/word-tower/wt-toaster.png',    atM: 1700, topPct: 24, xPct: 66, width: 104, depth: 1.0,  rangeM: 150 },
  // Cool sci-fi surprises up high.
  { id: 'portal',     src: '/images/word-tower/wt-portal.png',     atM: 950,  topPct: 28, xPct: 24, width: 110, depth: 0.8,  rangeM: 90 },
  { id: 'alien',      src: '/images/word-tower/wt-alien.png',      atM: 1450, topPct: 22, xPct: 70, width: 100, depth: 0.95, rangeM: 130 },
  { id: 'spaceship',  src: '/images/word-tower/wt-spaceship.png',  atM: 2100, topPct: 26, xPct: 30, width: 120, depth: 0.9,  rangeM: 180 },
  // More funny sights, slotted into the altitude gaps for variety on the climb.
  { id: 'jetpackCat', src: '/images/word-tower/wt-jetpack-cat.png', atM: 140,  topPct: 24, xPct: 30, width: 92,  depth: 1.1,  rangeM: 36 },
  { id: 'teacup',     src: '/images/word-tower/wt-teacup.png',      atM: 210,  topPct: 30, xPct: 70, width: 100, depth: 1.0,  rangeM: 46 },
  { id: 'donut',      src: '/images/word-tower/wt-donut.png',       atM: 410,  topPct: 26, xPct: 26, width: 96,  depth: 1.05, rangeM: 60 },
  { id: 'disco',      src: '/images/word-tower/wt-disco.png',       atM: 540,  topPct: 22, xPct: 68, width: 90,  depth: 0.9,  rangeM: 72 },
  { id: 'narwhal',    src: '/images/word-tower/wt-narwhal.png',     atM: 880,  topPct: 24, xPct: 28, width: 110, depth: 0.85, rangeM: 90 },
  { id: 'wizard',     src: '/images/word-tower/wt-wizard.png',      atM: 1350, topPct: 22, xPct: 70, width: 110, depth: 0.9,  rangeM: 120 },
  // Biome-native creature: a kawaii cosmic jellyfish drifting through the Nebula
  // band (500–800m), so the nebula reads as its OWN world, not just a pink sky.
  { id: 'nebulaJelly', src: '/images/word-tower/wt-nebula-jelly.png', atM: 580, topPct: 24, xPct: 30, width: 104, depth: 0.85, rangeM: 74 },
  // Biome-native creatures — one per band so every zone reads as its OWN world
  // (sleek, on-brand; see daily-content/word-tower-biome-props-v1).
  { id: 'cityBird',     src: '/images/word-tower/wt-city-bird.png',     atM: 38,   topPct: 26, xPct: 72, width: 92,  depth: 1.05, rangeM: 30 },
  { id: 'skyManta',     src: '/images/word-tower/wt-sky-manta.png',     atM: 90,   topPct: 22, xPct: 26, width: 120, depth: 0.95, rangeM: 36 },
  { id: 'stratSerpent', src: '/images/word-tower/wt-strat-serpent.png', atM: 235,  topPct: 28, xPct: 68, width: 116, depth: 0.9,  rangeM: 48 },
  { id: 'orbitJelly',   src: '/images/word-tower/wt-orbit-jelly.png',   atM: 430,  topPct: 24, xPct: 28, width: 104, depth: 0.8,  rangeM: 62 },
  { id: 'galaxyWhale',  src: '/images/word-tower/wt-galaxy-whale.png',  atM: 1050, topPct: 24, xPct: 70, width: 134, depth: 0.85, rangeM: 110 },
  // ── The DEEP band (1750m+). The ladder used to stop at 2100m, so a carried-over
  //    tower — the whole point of the daily mode — climbed into an empty sky.
  //    Windows widen with altitude (the climb slows up there, and a prop that
  //    passes in four drops reads as a set piece, not a conveyor belt). Keep the
  //    surprises getting stranger the higher you get: tea dragon → space bus →
  //    star fisherman → a window cleaner who is very far from any window.
  { id: 'teaDragon',    src: '/images/word-tower/wt-tea-dragon.png',    atM: 1750, topPct: 26, xPct: 26, width: 128, depth: 0.9,  rangeM: 150 },
  { id: 'moonBus',      src: '/images/word-tower/wt-moon-bus.png',      atM: 2000, topPct: 22, xPct: 70, width: 130, depth: 1.0,  rangeM: 160 },
  { id: 'starFisher',   src: '/images/word-tower/wt-star-fisher.png',   atM: 2350, topPct: 28, xPct: 28, width: 122, depth: 0.85, rangeM: 180 },
  { id: 'windowCleaner', src: '/images/word-tower/wt-space-window-cleaner.png', atM: 2600, topPct: 24, xPct: 68, width: 116, depth: 1.05, rangeM: 190 },
  { id: 'skyMailbox',   src: '/images/word-tower/wt-sky-mailbox.png',   atM: 2950, topPct: 26, xPct: 30, width: 112, depth: 0.95, rangeM: 200 },
  { id: 'donutPlanet',  src: '/images/word-tower/wt-donut-planet.png',  atM: 3300, topPct: 22, xPct: 66, width: 146, depth: 0.65, rangeM: 240 },
  { id: 'starCat',      src: '/images/word-tower/wt-star-cat.png',      atM: 3700, topPct: 24, xPct: 30, width: 138, depth: 0.75, rangeM: 260 },
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
