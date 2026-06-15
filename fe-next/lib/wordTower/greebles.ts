/**
 * Word Tower — structural greebles (pure, deterministic).
 *
 * To stop a tall tower reading as a clean stamped column, a minority of tiles
 * grow a small bolt-on detail on one edge — an antenna, a strut, a panel, a
 * beacon. INDUSTRIAL / sci-fi, never cute: this is structure, not decoration
 * (only the brand mascot is kawaii). The kind is chosen by the biome surface so
 * the silhouette evolves city → deep space.
 *
 * Deterministic by `pos` (same seed family as tileVariation) → a tower looks
 * identical on every replay, so the leaderboard stays fair. Renderer-agnostic:
 * the scene maps {@link Greeble} onto hard-pixel Pixi Graphics once at build.
 */

import type { BlockSurface } from './blockGrade';

export type GreebleKind = 'antenna' | 'strut' | 'panel' | 'beacon' | 'fin';
export type GreebleSide = 'left' | 'right';

export interface Greeble {
  kind: GreebleKind;
  side: GreebleSide;
  /** Length/size as a fraction of the tile size, ~[0.18, 0.4]. */
  sizeFrac: number;
}

/** Fraction of tiles that sprout a greeble. Sparse — clutter kills the read. */
export const GREEBLE_CHANCE = 0.26;

/** Deterministic hash → [0, 1) from a real-valued seed (matches tileVariation). */
function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Industrial detail kinds available per biome surface (no cutesy shapes). */
const KINDS_BY_SURFACE: Record<BlockSurface, GreebleKind[]> = {
  windows: ['antenna', 'strut'], // city rooftops: aerials, fire-escape struts
  glass: ['panel', 'fin'], // sky curtain wall: cladding panels, brise-soleil fins
  panels: ['strut', 'panel'], // stratosphere hull: ribs + plating
  greebles: ['antenna', 'panel'], // orbit: dish + solar array
  facets: ['fin', 'beacon'], // nebula: crystalline fins + a warning beacon
  energy: ['beacon', 'antenna'], // deep space: a lone blinking beacon / probe
};

/**
 * Deterministic greeble for the tile at `pos` on a given `surface`, or null for
 * the majority of tiles. Stable across re-renders and replays.
 */
export function pickGreeble(pos: number, surface: BlockSurface): Greeble | null {
  const gate = hash01(pos * 2.17 + 11.3);
  if (gate >= GREEBLE_CHANCE) return null;
  const kinds = KINDS_BY_SURFACE[surface] ?? ['strut'];
  const kind = kinds[Math.floor(hash01(pos * 5.31 + 7.7) * kinds.length) % kinds.length];
  const side: GreebleSide = hash01(pos * 9.13 + 1.9) < 0.5 ? 'left' : 'right';
  const sizeFrac = 0.18 + hash01(pos * 3.77 + 41.2) * 0.22;
  return { kind, side, sizeFrac };
}
