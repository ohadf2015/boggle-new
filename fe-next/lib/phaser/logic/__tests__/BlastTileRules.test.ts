/**
 * BlastTileRules — pure functions for blast tile visual configs in Phaser.
 * Converts CSS/Tailwind colours from BlastTileOverlay into 0xRRGGBB integers.
 *
 * RED phase: these tests must fail before the implementation exists.
 */

import {
  getBlastTileTint,
  getBlastTileBorderColor,
  getBlastTileGlowConfig,
  getExplosionColor,
  BLAST_TILE_CONFIGS,
  type BlastTileVisualConfig,
} from '../BlastTileRules';

import type { BlastTileType } from '@/components/blast/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All 14 tile types (standard + 13 special including mirror/silver/diamond/wildcard) */
const ALL_TYPES: BlastTileType[] = [
  'standard', 'gold', 'bomb', 'rainbow', 'ice', 'wildcard',
  'lightning', 'magnet', 'prism', 'gem', 'frozen',
  'mirror', 'silver', 'diamond',
];

/**
 * Special types that have BLAST_TILE_CONFIGS entries.
 * Wildcard is in the type union but is never spawned and has no config entry.
 */
const SPECIAL_TYPES: BlastTileType[] = ALL_TYPES.filter(t => t !== 'standard' && t !== 'wildcard');

/** The 3 tile types added in Phase 47 that needed Phaser visual configs */
const NEW_TYPES: BlastTileType[] = ['mirror', 'silver', 'diamond'];

function isValidHex(n: number): boolean {
  return Number.isInteger(n) && n >= 0x000000 && n <= 0xffffff;
}

// ─── getBlastTileTint ─────────────────────────────────────────────────────────

describe('getBlastTileTint', () => {
  it('returns a valid 24-bit hex for every tile type', () => {
    for (const type of ALL_TYPES) {
      expect(isValidHex(getBlastTileTint(type))).toBe(true);
    }
  });

  it('returns white (0xffffff) for standard tiles', () => {
    expect(getBlastTileTint('standard')).toBe(0xffffff);
  });

  it('returns gold tint for gold tiles', () => {
    expect(getBlastTileTint('gold')).toBe(0xffd700);
  });

  it('returns distinct tints for each special type', () => {
    const tints = new Set(SPECIAL_TYPES.map(t => getBlastTileTint(t)));
    // Each special type should have a unique tint
    expect(tints.size).toBe(SPECIAL_TYPES.length);
  });
});

// ─── getBlastTileBorderColor ──────────────────────────────────────────────────

describe('getBlastTileBorderColor', () => {
  it('returns a valid 24-bit hex for every tile type', () => {
    for (const type of ALL_TYPES) {
      expect(isValidHex(getBlastTileBorderColor(type))).toBe(true);
    }
  });

  it('returns default border (0x0d0d0d) for standard tiles', () => {
    expect(getBlastTileBorderColor('standard')).toBe(0x0d0d0d);
  });

  it('returns gold-tinted border for gold tiles', () => {
    const border = getBlastTileBorderColor('gold');
    expect(border).not.toBe(0x0d0d0d);
    expect(isValidHex(border)).toBe(true);
  });
});

// ─── getBlastTileGlowConfig ──────────────────────────────────────────────────

describe('getBlastTileGlowConfig', () => {
  it('returns color, intensity, radius for a special tile', () => {
    const glow = getBlastTileGlowConfig('gold', 0);
    expect(typeof glow.color).toBe('number');
    expect(typeof glow.intensity).toBe('number');
    expect(typeof glow.radius).toBe('number');
    expect(isValidHex(glow.color)).toBe(true);
  });

  it('returns zero intensity for standard tiles (no glow)', () => {
    const glow = getBlastTileGlowConfig('standard', 0);
    expect(glow.intensity).toBe(0);
  });

  it('returns reduced glow for ice with 1 hit remaining (cracked state)', () => {
    const fullGlow = getBlastTileGlowConfig('ice', 2);
    const crackedGlow = getBlastTileGlowConfig('ice', 1);
    expect(crackedGlow.intensity).toBeLessThan(fullGlow.intensity);
  });

  it('returns increased glow for prism with 1 hit remaining (about to detonate)', () => {
    const fullGlow = getBlastTileGlowConfig('prism', 2);
    const crackedGlow = getBlastTileGlowConfig('prism', 1);
    expect(crackedGlow.intensity).toBeGreaterThan(fullGlow.intensity);
  });

  it('scales gem glow intensity based on hitsRemaining', () => {
    const glow3 = getBlastTileGlowConfig('gem', 3);
    const glow1 = getBlastTileGlowConfig('gem', 1);
    // Lower hits remaining = closer to collection = more intense
    expect(glow1.intensity).toBeGreaterThan(glow3.intensity);
  });

  it('returns reduced glow for frozen with fewer hits remaining', () => {
    const glow3 = getBlastTileGlowConfig('frozen', 3);
    const glow1 = getBlastTileGlowConfig('frozen', 1);
    expect(glow1.intensity).toBeLessThan(glow3.intensity);
  });
});

// ─── getExplosionColor ────────────────────────────────────────────────────────

describe('getExplosionColor', () => {
  const EXPLOSION_TYPES = ['word', 'bomb', 'clear', 'cascade', 'lightning', 'magnet', 'prism', 'gem'] as const;

  it('returns a valid 24-bit hex for every explosion type', () => {
    for (const type of EXPLOSION_TYPES) {
      expect(isValidHex(getExplosionColor(type))).toBe(true);
    }
  });

  it('returns red/orange for bomb explosions', () => {
    const color = getExplosionColor('bomb');
    // Extract red channel: should be high
    const red = (color >> 16) & 0xff;
    expect(red).toBeGreaterThanOrEqual(200);
  });

  it('returns yellow for lightning explosions', () => {
    const color = getExplosionColor('lightning');
    const red = (color >> 16) & 0xff;
    const green = (color >> 8) & 0xff;
    // Yellow = high red + high green
    expect(red).toBeGreaterThanOrEqual(200);
    expect(green).toBeGreaterThanOrEqual(200);
  });

  it('returns purple for magnet explosions', () => {
    const color = getExplosionColor('magnet');
    // Purple = high red, low green, high blue
    const red = (color >> 16) & 0xff;
    const blue = color & 0xff;
    expect(red).toBeGreaterThanOrEqual(100);
    expect(blue).toBeGreaterThanOrEqual(100);
  });

  it('returns green for gem explosions', () => {
    const color = getExplosionColor('gem');
    const green = (color >> 8) & 0xff;
    expect(green).toBeGreaterThanOrEqual(150);
  });
});

// ─── BLAST_TILE_CONFIGS ───────────────────────────────────────────────────────

describe('BLAST_TILE_CONFIGS', () => {
  it('has an entry for every special tile type', () => {
    for (const type of SPECIAL_TYPES) {
      expect((BLAST_TILE_CONFIGS as Record<string, BlastTileVisualConfig>)[type]).toBeDefined();
    }
  });

  it('does not have an entry for standard type', () => {
    expect((BLAST_TILE_CONFIGS as Record<string, BlastTileVisualConfig>)['standard']).toBeUndefined();
  });

  it('each config has tint, borderColor, and badgeText', () => {
    for (const type of SPECIAL_TYPES) {
      const config = (BLAST_TILE_CONFIGS as Record<string, BlastTileVisualConfig>)[type];
      expect(typeof config.tint).toBe('number');
      expect(typeof config.borderColor).toBe('number');
      expect(typeof config.badgeText).toBe('string');
      expect(config.badgeText.length).toBeGreaterThan(0);
    }
  });

  it('badge texts match expected values from BlastTileOverlay', () => {
    expect(BLAST_TILE_CONFIGS.gold.badgeText).toBe('3×');
    expect(BLAST_TILE_CONFIGS.bomb.badgeText).toBe('8');
    expect(BLAST_TILE_CONFIGS.rainbow.badgeText).toBe('+5');
    expect(BLAST_TILE_CONFIGS.ice.badgeText).toBe('×2');
    expect(BLAST_TILE_CONFIGS.lightning.badgeText).toBe('col');
    expect(BLAST_TILE_CONFIGS.magnet.badgeText).toBe('pull');
    expect(BLAST_TILE_CONFIGS.prism.badgeText).toBe('×2');
    expect(BLAST_TILE_CONFIGS.gem.badgeText).toBe('+3');
    expect(BLAST_TILE_CONFIGS.frozen.badgeText).toBe('×3');
  });
});

// ─── mirror / silver / diamond tile configs (Phase 47 additions) ──────────────

describe('mirror/silver/diamond tile visual configs', () => {
  it('getBlastTileTint returns valid hex for mirror, silver, diamond', () => {
    for (const type of NEW_TYPES) {
      expect(isValidHex(getBlastTileTint(type))).toBe(true);
    }
  });

  it('getBlastTileBorderColor returns valid hex for mirror, silver, diamond', () => {
    for (const type of NEW_TYPES) {
      expect(isValidHex(getBlastTileBorderColor(type))).toBe(true);
    }
  });

  it('getBlastTileGlowConfig returns non-zero intensity for mirror, silver, diamond', () => {
    for (const type of NEW_TYPES) {
      const glow = getBlastTileGlowConfig(type, 0);
      expect(glow.intensity).toBeGreaterThan(0);
    }
  });

  it('BLAST_TILE_CONFIGS has mirror, silver, diamond entries with badgeText', () => {
    for (const type of NEW_TYPES) {
      const config = (BLAST_TILE_CONFIGS as Record<string, BlastTileVisualConfig>)[type];
      expect(config).toBeDefined();
      expect(typeof config.tint).toBe('number');
      expect(typeof config.borderColor).toBe('number');
      expect(config.badgeText.length).toBeGreaterThan(0);
    }
  });

  it('BLAST_TILE_CONFIGS does NOT have a wildcard entry', () => {
    expect((BLAST_TILE_CONFIGS as Record<string, BlastTileVisualConfig>)['wildcard']).toBeUndefined();
  });

  it('mirror tint is silver-reflective (high R, G, B components)', () => {
    const tint = getBlastTileTint('mirror');
    const r = (tint >> 16) & 0xff;
    const g = (tint >> 8) & 0xff;
    const b = tint & 0xff;
    // Silver-gray: all channels should be reasonably high and similar
    expect(r).toBeGreaterThanOrEqual(0xa0);
    expect(g).toBeGreaterThanOrEqual(0xa0);
    expect(b).toBeGreaterThanOrEqual(0xa0);
  });

  it('diamond tint has blue-white character (blue >= red)', () => {
    const tint = getBlastTileTint('diamond');
    const r = (tint >> 16) & 0xff;
    const b = tint & 0xff;
    expect(b).toBeGreaterThanOrEqual(r);
  });
});
