/**
 * Procedural scenery for the v2 backdrop — pure, seeded, so server and client
 * (and every test) agree on the exact same skyline.
 */
import { BIOMES, type PropKind } from './biomes';

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
/** Nothing in the first floors of sky: it would hang right on the street. */
const FIRST_PROP_FLOOR = 2;
/** How far past the last sky's start props keep coming. */
const LAST_BAND_FLOORS = 30;

/** Every sky prop for a run, placed inside the band of the sky that owns it. */
export function skyProps(seed: number): SkyProp[] {
  const r = rng(seed);
  const out: SkyProp[] = [];
  BIOMES.forEach((biome, i) => {
    const from = Math.max(FIRST_PROP_FLOOR, biome.fromFloor);
    const to = BIOMES[i + 1]?.fromFloor ?? biome.fromFloor + LAST_BAND_FLOORS;
    for (let floor = from + r() * FLOORS_PER_PROP; floor < to; floor += FLOORS_PER_PROP * (0.6 + r() * 0.8)) {
      out.push({
        kind: biome.props[Math.floor(r() * biome.props.length)],
        floor,
        x: r() * 2 - 1,
        size: 0.7 + r() * 0.6,
        phase: r(),
      });
    }
  });
  return out;
}
