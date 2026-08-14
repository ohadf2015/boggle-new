/**
 * Word Tower — TENANTS (pure).
 *
 * Tower Bloxx's best trick is that a finished floor immediately gets *occupied*:
 * little people drift down under umbrellas and move in, so the tower is a place
 * people live in rather than a stack of boxes. Founder 2026-08-14: "in tower
 * bloxx we have people with umbrellas coming inside block when it is done… we
 * need to think how we can make our feel more alive."
 *
 * This module decides WHO arrives on a floor and from where; the Pixi layer
 * animates them (see `spawnTenants` in components/wordTower/towerSprites.ts).
 *
 * Two rules make it feel authored rather than random:
 *  1. Deterministic per floor — a re-render, a resize or a pan must never
 *     re-roll a floor's residents (the tower would visibly churn).
 *  2. The cast unlocks with ALTITUDE, so climbing keeps introducing arrivals the
 *     player has not seen: umbrellas at street level, balloons over the city,
 *     jetpacks in the clouds, and something odder up in the black.
 */

export type TenantKind = 'umbrella' | 'briefcase' | 'balloon' | 'kite' | 'jetpack' | 'ufo' | 'astronaut';

export interface TenantKindDef {
  id: TenantKind;
  /** Altitude (m) from which this arrival can show up. */
  fromM: number;
  /** Glyph drawn descending; kept as text so no atlas/art pipeline is needed. */
  glyph: string;
  /** Canopy/lift glyph drawn above the tenant ('' = falls with no canopy). */
  canopy: string;
  /** Descent speed multiplier — a balloon dawdles, a jetpack drops in fast. */
  speed: number;
  /** Sideways sway amplitude (px) during the descent. */
  sway: number;
}

export const TENANT_KINDS: readonly TenantKindDef[] = [
  { id: 'umbrella',   fromM: 0,    glyph: '🧍', canopy: '☂️', speed: 1,    sway: 14 },
  { id: 'briefcase',  fromM: 0,    glyph: '🧑‍💼', canopy: '☂️', speed: 1.1,  sway: 10 },
  { id: 'balloon',    fromM: 400,  glyph: '🧍', canopy: '🎈', speed: 0.75, sway: 20 },
  { id: 'kite',       fromM: 700,  glyph: '🧒', canopy: '🪁', speed: 0.85, sway: 24 },
  { id: 'jetpack',    fromM: 1100, glyph: '🦸', canopy: '',   speed: 1.6,  sway: 6 },
  { id: 'ufo',        fromM: 1800, glyph: '👽', canopy: '🛸', speed: 0.9,  sway: 18 },
  { id: 'astronaut',  fromM: 2400, glyph: '👨‍🚀', canopy: '🪐', speed: 0.7,  sway: 12 },
];

/** Every arrival kind available at this altitude (always non-empty). */
export function tenantKindsAt(heightM: number): TenantKind[] {
  return TENANT_KINDS.filter((k) => heightM >= k.fromM).map((k) => k.id);
}

export interface TenantArrival {
  /** How many tenants move in (1..MAX_TENANTS). */
  count: number;
  kind: TenantKind;
  /** Which side they drift in from — alternates the composition floor to floor. */
  fromLeft: boolean;
  /** Per-tenant descent delay (ms) so they arrive as a trickle, not a clump. */
  staggerMs: number;
}

/** A crowded floor is a busy floor, but four glyphs is already a lot of motion
 *  over one row of letters. */
export const MAX_TENANTS = 4;
/** Gap between arrivals on the same floor (ms). */
const STAGGER_MS = 180;

/** Stable hash → 0..1. Same inputs, same value, forever (no Math.random: the
 *  scene re-derives arrivals on any re-render). */
function hash01(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Who moves into `floorIndex` (a floor `wordLen` letters wide) at `heightM`.
 *
 * Crowd size follows the WORD LENGTH: a longer word is a wider floor, so it
 * houses more people — the same "vocabulary buys building" currency the floor
 * geometry already spends (see towerFloor.ts).
 */
export function tenantArrival(floorIndex: number, wordLen: number, heightM: number): TenantArrival {
  const kinds = tenantKindsAt(heightM);
  const seed = hash01(floorIndex + 1, wordLen + 1);
  const kind = kinds[Math.floor(seed * kinds.length) % kinds.length];
  // 3-letter floor → 1, and one more tenant per 2 extra letters, capped.
  const byWord = 1 + Math.floor(Math.max(0, wordLen - 3) / 2);
  const jitter = hash01(floorIndex + 7, 3) > 0.72 ? 1 : 0;
  return {
    count: Math.max(1, Math.min(MAX_TENANTS, byWord + jitter)),
    kind,
    fromLeft: floorIndex % 2 === 0,
    staggerMs: STAGGER_MS,
  };
}
