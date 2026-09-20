/**
 * Word Tower v2 skies — v2's own table, measured in FLOORS.
 *
 * v1's biomes were metres tuned for a game where one word bought several metres,
 * rescaled by a fudge multiplier and drawn by DOM layers that re-rendered on every
 * height publish (the flicker at every biome change). Here a sky is a pure
 * function of floors, blended continuously across a band, and drawn by Pixi.
 */
import { PX_PER_M } from './engine';
import { BLOCK_HEIGHT_PX } from './scoring';

export type BiomeId = 'downtown' | 'sunset' | 'clouds' | 'jetstream' | 'aurora' | 'orbit' | 'cosmos';

export type PropKind = 'cloud' | 'bird' | 'balloon' | 'jet' | 'aurora' | 'satellite' | 'planet' | 'comet';

/**
 * The backdrop effect behind a sky. One rotating sunburst used to hang behind
 * the ENTIRE climb — street to deep space — so however far you got, the sky
 * behind you was the same picture. Each sky now owns one, and no two
 * consecutive skies share it (biomes.test pins that), so arriving somewhere new
 * actually looks like arriving somewhere new.
 */
export type SkyFx = 'rays' | 'haze' | 'streaks' | 'curtain' | 'deep';

export interface Biome {
  id: BiomeId;
  /** First floor fully inside this sky. */
  fromFloor: number;
  skyTop: number;
  skyBottom: number;
  /** Brand accent for the wheel, sunburst and callouts. */
  accent: number;
  /** 0..1 star field strength. */
  stars: number;
  /** Tint for the far city silhouettes. */
  city: number;
  props: PropKind[];
  fx: SkyFx;
}

export const BIOMES: Biome[] = [
  { id: 'downtown', fromFloor: 0, skyTop: 0x2f7bff, skyBottom: 0x8fd8ff, accent: 0xbfff00, stars: 0, city: 0x2a2f5a, props: ['cloud', 'bird'], fx: 'rays' },
  { id: 'sunset', fromFloor: 3, skyTop: 0x5b2a86, skyBottom: 0xff8a4c, accent: 0xff4d9d, stars: 0, city: 0x3b1f4f, props: ['bird', 'balloon', 'cloud'], fx: 'haze' },
  { id: 'clouds', fromFloor: 6, skyTop: 0x7a5cff, skyBottom: 0xffb3d9, accent: 0x37e0ff, stars: 0, city: 0x4a3a8a, props: ['cloud', 'balloon'], fx: 'rays' },
  { id: 'jetstream', fromFloor: 10, skyTop: 0x1b1f5e, skyBottom: 0x3f6fd8, accent: 0x37e0ff, stars: 0.25, city: 0x1b1f45, props: ['jet', 'cloud'], fx: 'streaks' },
  { id: 'aurora', fromFloor: 15, skyTop: 0x061233, skyBottom: 0x0f4d5c, accent: 0xbfff00, stars: 0.6, city: 0x0a1a2a, props: ['aurora', 'jet'], fx: 'curtain' },
  { id: 'orbit', fromFloor: 21, skyTop: 0x02030d, skyBottom: 0x141a45, accent: 0xb06cff, stars: 1, city: 0x05060f, props: ['satellite', 'planet'], fx: 'deep' },
  { id: 'cosmos', fromFloor: 28, skyTop: 0x12002a, skyBottom: 0x3a0a5e, accent: 0xff4d9d, stars: 1, city: 0x05060f, props: ['comet', 'planet', 'satellite'], fx: 'rays' },
];

/** Floors over which one sky fades into the next, ending at the next's fromFloor. */
const BLEND_FLOORS = 2;

const FLOOR_M = BLOCK_HEIGHT_PX / PX_PER_M;

export function floorsAt(heightM: number): number {
  return Math.max(0, heightM) / FLOOR_M;
}

export function biomeAt(floors: number): Biome {
  let out = BIOMES[0];
  for (const b of BIOMES) if (floors >= b.fromFloor) out = b;
  return out;
}

export function lerpColour(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const ca = (a >> shift) & 255;
    const cb = (b >> shift) & 255;
    return Math.round(ca + (cb - ca) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

export interface Sky {
  from: Biome;
  to: Biome;
  /** 0..1 progress from `from` to `to`. */
  t: number;
  top: number;
  bottom: number;
  stars: number;
  accent: number;
  city: number;
}

/** The sky at a (fractional) floor: continuous everywhere, so it can never snap. */
export function skyAt(floors: number): Sky {
  const i = BIOMES.indexOf(biomeAt(floors));
  const from = BIOMES[i];
  const to = BIOMES[Math.min(i + 1, BIOMES.length - 1)];
  const start = to.fromFloor - BLEND_FLOORS;
  const raw = to === from ? 0 : Math.min(1, Math.max(0, (floors - start) / BLEND_FLOORS));
  const t = raw * raw * (3 - 2 * raw);
  return {
    from,
    to,
    t,
    top: lerpColour(from.skyTop, to.skyTop, t),
    bottom: lerpColour(from.skyBottom, to.skyBottom, t),
    stars: from.stars + (to.stars - from.stars) * t,
    accent: t < 0.5 ? from.accent : to.accent,
    city: lerpColour(from.city, to.city, t),
  };
}
