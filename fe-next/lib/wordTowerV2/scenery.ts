/**
 * Procedural scenery for the v2 backdrop — pure, seeded, so server and client
 * (and every test) agree on the exact same skyline.
 */
import { BIOMES, FOOD_KINDS, type PropKind } from './biomes';

export interface SkylineWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Index into the lit palette, or -1 for a dark pane. */
  lit: number;
}

export interface SkylineBuilding {
  x: number;
  w: number;
  h: number;
  /** Rooftop feature: none, antenna with a blinking light, or a water tank. */
  roof: 'none' | 'antenna' | 'tank';
  windows: SkylineWindow[];
}

/** mulberry32: tiny, fast, good enough for scenery. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WIN = 7;
const GAP = 6;

export function buildSkyline(seed: number, width: number, minH = 70, maxH = 230): SkylineBuilding[] {
  const r = rng(seed);
  const out: SkylineBuilding[] = [];
  let x = 0;
  while (x < width) {
    const w = Math.round(38 + r() * 70);
    const h = Math.round(minH + r() * (maxH - minH));
    const roofRoll = r();
    const windows: SkylineWindow[] = [];
    const cols = Math.floor((w - GAP) / (WIN + GAP));
    const rows = Math.floor((h - 14) / (WIN + GAP + 2));
    const padX = Math.floor((w - cols * (WIN + GAP) + GAP) / 2);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const roll = r();
        windows.push({
          x: padX + col * (WIN + GAP),
          y: 12 + row * (WIN + GAP + 2),
          w: WIN,
          h: WIN + 2,
          lit: roll < 0.2 ? Math.floor(roll * 15) % 3 : -1,
        });
      }
    }
    out.push({ x, w, h, roof: roofRoll < 0.22 ? 'antenna' : roofRoll < 0.36 ? 'tank' : 'none', windows });
    x += w;
  }
  return out;
}

export interface RulerTick {
  m: number;
  major: boolean;
}

/** Whole-metre ticks between two heights (never below ground); every 5th is major. */
export function rulerTicks(fromM: number, toM: number): RulerTick[] {
  const ticks: RulerTick[] = [];
  for (let m = Math.max(0, Math.ceil(fromM)); m <= Math.floor(toM); m += 1) ticks.push({ m, major: m % 5 === 0 });
  return ticks;
}

export interface SkyProp {
  kind: PropKind;
  /** Altitude, in floors. */
  floor: number;
  /** Horizontal position, -1 (left edge) .. 1 (right edge). */
  x: number;
  /** Size multiplier, ~0.7..1.3. */
  size: number;
  /** 0..1 seed for per-prop animation phase / variant. */
  phase: number;
}

/** Floors of sky per prop: dense enough to feel the climb, sparse enough to stay calm. */
const FLOORS_PER_PROP = 1.8;
/** Share of props that are a snack or toy from any sky instead of the sky's own. */
export const SURPRISE_SHARE = 0.4;
/** Props keep out of the middle of the screen, where the tower and the hook are... */
export const PROP_CLEAR_X = 0.5;
/** ...and off the very edge, where half of one would hang off screen. */
export const PROP_EDGE_X = 0.85;
/** Props stay smaller than the floors so they never compete with the tower. */
export const PROP_SIZE_MIN = 0.55;
export const PROP_SIZE_MAX = 0.95;
/** Nothing in the first floors of sky: it would hang right on the street. */
const FIRST_PROP_FLOOR = 2;
/** How far past the last sky's start props keep coming. */
const LAST_BAND_FLOORS = 30;

/**
 * Every sky prop for a run, placed inside the band of the sky that owns it.
 * A share of them are snacks and toys from any sky (a pizza slice past the
 * jets, an avocado in orbit), and the seed is new each run, so the climb
 * never shows the same sky twice.
 */
export function skyProps(seed: number): SkyProp[] {
  const r = rng(seed);
  const out: SkyProp[] = [];
  let last: PropKind | null = null;
  BIOMES.forEach((biome, i) => {
    const from = Math.max(FIRST_PROP_FLOOR, biome.fromFloor);
    const to = BIOMES[i + 1]?.fromFloor ?? biome.fromFloor + LAST_BAND_FLOORS;
    for (let floor = from + r() * FLOORS_PER_PROP; floor < to; floor += FLOORS_PER_PROP * (0.6 + r() * 0.8)) {
      const surprise = r() < SURPRISE_SHARE;
      const pool: readonly PropKind[] = surprise ? FOOD_KINDS : biome.props;
      let kind = pool[Math.floor(r() * pool.length)];
      // Two of the same thing in a row reads as a pattern, not a surprise.
      if (kind === last && pool.length > 1) kind = pool[(pool.indexOf(kind) + 1) % pool.length];
      last = kind;
      const side = r() < 0.5 ? -1 : 1;
      out.push({
        kind,
        floor,
        x: kind === 'aurora' ? 0 : side * (PROP_CLEAR_X + r() * (PROP_EDGE_X - PROP_CLEAR_X)),
        size: PROP_SIZE_MIN + r() * (PROP_SIZE_MAX - PROP_SIZE_MIN),
        phase: r(),
      });
    }
  });
  return out;
}
