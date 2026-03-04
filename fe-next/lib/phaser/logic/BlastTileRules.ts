/**
 * BlastTileRules — pure functions for blast tile visual configs in Phaser.
 *
 * Translates the CSS gradients/Tailwind classes from BlastTileOverlay.tsx
 * into Phaser-native 0xRRGGBB hex integers. Zero Phaser dependencies.
 *
 * Colour source: BlastTileOverlay.tsx TILE_BACKGROUNDS + TILE_ICONS
 */

import type { BlastTileType, BlastExplosion } from '@/components/blast/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BlastTileVisualConfig {
  /** Primary 0xRRGGBB tint for the tile background */
  tint: number;
  /** 0xRRGGBB border/stroke colour */
  borderColor: number;
  /** Badge label text (bottom-right corner, e.g. "3×", "+5") */
  badgeText: string;
}

export interface GlowConfig {
  /** 0xRRGGBB glow colour */
  color: number;
  /** Glow intensity 0‥1 (0 = no glow) */
  intensity: number;
  /** Glow radius in pixels */
  radius: number;
}

// ─── Tile tint colours (dominant hue from each CSS gradient) ─────────────────

const TILE_TINTS: Record<BlastTileType, number> = {
  standard:  0xffffff,
  gold:      0xffd700, // #FFD700 — gold
  bomb:      0xff6440, // #FF6440 — orange-red
  rainbow:   0xff64c8, // #FF64C8 — pink-magenta
  ice:       0xb4e6ff, // #B4E6FF — light ice-blue
  wildcard:  0xc8c8ff, // #C8C8FF — soft lavender
  lightning: 0xffe100, // #FFE100 — electric yellow
  magnet:    0x8b00ff, // #8B00FF — violet
  prism:     0xff69b4, // #FF69B4 — hot pink (rainbow conic midpoint)
  gem:       0x50c878, // #50C878 — emerald
  frozen:    0xc8dcff, // #C8DCFF — pale blue
  mirror:    0xd4d4d8, // silver-gray
  silver:    0xc0c0c0, // silver
  diamond:   0xb9f2ff, // light diamond blue
};

// ─── Tile border colours (from CSS border declarations) ──────────────────────

const TILE_BORDERS: Record<BlastTileType, number> = {
  standard:  0x0d0d0d,
  gold:      0xffd700,
  bomb:      0xff4628,
  rainbow:   0xa855f7,
  ice:       0x96dcff,
  wildcard:  0xffffff,
  lightning: 0xffe100,
  magnet:    0x8b00ff,
  prism:     0xffffff,
  gem:       0x50c878,
  frozen:    0xb4dcff,
  mirror:    0xd4d4d8,
  silver:    0xc0c0c0,
  diamond:   0xb9f2ff,
};

// ─── Per-type glow base configs ──────────────────────────────────────────────

interface GlowBase {
  color: number;
  intensity: number;
  radius: number;
}

const GLOW_BASES: Record<BlastTileType, GlowBase> = {
  standard:  { color: 0x000000, intensity: 0,    radius: 0 },
  gold:      { color: 0xffd700, intensity: 0.6,  radius: 12 },
  bomb:      { color: 0xff4628, intensity: 0.55, radius: 10 },
  rainbow:   { color: 0xa855f7, intensity: 0.5,  radius: 10 },
  ice:       { color: 0x96dcff, intensity: 0.5,  radius: 10 },
  wildcard:  { color: 0xffffff, intensity: 0.35, radius: 8 },
  lightning: { color: 0xffe100, intensity: 0.55, radius: 10 },
  magnet:    { color: 0x8b00ff, intensity: 0.5,  radius: 10 },
  prism:     { color: 0xffffff, intensity: 0.5,  radius: 12 },
  gem:       { color: 0x50c878, intensity: 0.45, radius: 10 },
  frozen:    { color: 0xb4dcff, intensity: 0.5,  radius: 10 },
  mirror:    { color: 0xd4d4d8, intensity: 0.4,  radius: 8 },
  silver:    { color: 0xc0c0c0, intensity: 0.45, radius: 10 },
  diamond:   { color: 0xb9f2ff, intensity: 0.6,  radius: 12 },
};

// ─── Explosion colours (per explosion type) ──────────────────────────────────

const EXPLOSION_COLORS: Record<BlastExplosion['type'], number> = {
  word:               0xffe135, // neo-yellow
  bomb:               0xff4628, // red-orange
  clear:              0x00ffff, // neo-cyan
  cascade:            0xff1493, // neo-pink / magenta
  lightning:          0xffe100, // electric yellow
  magnet:             0x8b00ff, // violet
  prism:              0xff69b4, // hot pink
  gem:                0x50c878, // emerald
  combo:              0xff6b35, // orange — special tile combo
  mega_blast:         0xff1493, // deep pink — mega blast
  total_destruction:  0xffe135, // bright yellow — total destruction
};

// ─── BLAST_TILE_CONFIGS — static lookup per special type ─────────────────────
// Badge text extracted from BlastTileOverlay TILE_ICONS.label

// Wildcard is in the BlastTileType union but is never spawned (removed in Phase 47).
// BLAST_TILE_CONFIGS excludes both 'standard' (no overlay) and 'wildcard' (never spawned).
export const BLAST_TILE_CONFIGS: Record<Exclude<BlastTileType, 'standard' | 'wildcard'>, BlastTileVisualConfig> = {
  gold:      { tint: TILE_TINTS.gold,      borderColor: TILE_BORDERS.gold,      badgeText: '3×' },
  bomb:      { tint: TILE_TINTS.bomb,      borderColor: TILE_BORDERS.bomb,      badgeText: '8' },
  rainbow:   { tint: TILE_TINTS.rainbow,   borderColor: TILE_BORDERS.rainbow,   badgeText: '+5' },
  ice:       { tint: TILE_TINTS.ice,       borderColor: TILE_BORDERS.ice,       badgeText: '×2' },
  lightning: { tint: TILE_TINTS.lightning, borderColor: TILE_BORDERS.lightning, badgeText: 'col' },
  magnet:    { tint: TILE_TINTS.magnet,    borderColor: TILE_BORDERS.magnet,    badgeText: 'pull' },
  prism:     { tint: TILE_TINTS.prism,     borderColor: TILE_BORDERS.prism,     badgeText: '×2' },
  gem:       { tint: TILE_TINTS.gem,       borderColor: TILE_BORDERS.gem,       badgeText: '+3' },
  frozen:    { tint: TILE_TINTS.frozen,    borderColor: TILE_BORDERS.frozen,    badgeText: '×3' },
  mirror:    { tint: TILE_TINTS.mirror,    borderColor: TILE_BORDERS.mirror,    badgeText: '↔' },
  silver:    { tint: TILE_TINTS.silver,    borderColor: TILE_BORDERS.silver,    badgeText: '×4' },
  diamond:   { tint: TILE_TINTS.diamond,   borderColor: TILE_BORDERS.diamond,   badgeText: '×5' },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/** Primary tint for a blast tile type (0xRRGGBB). */
export function getBlastTileTint(type: BlastTileType): number {
  return TILE_TINTS[type];
}

/** Border/stroke colour for a blast tile type (0xRRGGBB). */
export function getBlastTileBorderColor(type: BlastTileType): number {
  return TILE_BORDERS[type];
}

/**
 * Glow configuration for a tile, accounting for multi-hit states.
 *
 * - ice/frozen: glow fades as hits decrease (cracking)
 * - prism: glow intensifies as hits decrease (about to detonate)
 * - gem: glow intensifies as hits decrease (closer to collection)
 * - standard: no glow (intensity 0)
 */
export function getBlastTileGlowConfig(type: BlastTileType, hitsRemaining: number): GlowConfig {
  const base = GLOW_BASES[type];
  if (base.intensity === 0) return { color: 0x000000, intensity: 0, radius: 0 };

  switch (type) {
    case 'ice': {
      // 2 hits = full glow, 1 hit = faded (cracked)
      const scale = hitsRemaining >= 2 ? 1.0 : 0.5;
      return { color: base.color, intensity: base.intensity * scale, radius: base.radius };
    }
    case 'prism': {
      // 2 hits = normal, 1 hit = intense (about to detonate)
      const scale = hitsRemaining <= 1 ? 1.5 : 1.0;
      return { color: base.color, intensity: base.intensity * scale, radius: base.radius };
    }
    case 'gem': {
      // 3 hits = dim, 2 = mid, 1 = bright (closer to collection)
      const scale = hitsRemaining >= 3 ? 0.7 : hitsRemaining === 2 ? 1.0 : 1.4;
      return { color: base.color, intensity: base.intensity * scale, radius: base.radius };
    }
    case 'frozen': {
      // 3 hits = full, 2 = faded, 1 = very faded (thawing)
      const scale = hitsRemaining >= 3 ? 1.0 : hitsRemaining === 2 ? 0.7 : 0.4;
      return { color: base.color, intensity: base.intensity * scale, radius: base.radius };
    }
    default:
      return { color: base.color, intensity: base.intensity, radius: base.radius };
  }
}

/** Explosion particle colour for a given explosion type (0xRRGGBB). */
export function getExplosionColor(explosionType: BlastExplosion['type']): number {
  return EXPLOSION_COLORS[explosionType];
}
