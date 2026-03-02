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

/** All 11 tile types (standard + 10 special) */
const ALL_TYPES: BlastTileType[] = [
  'standard', 'gold', 'bomb', 'rainbow', 'ice', 'wildcard',
  'lightning', 'magnet', 'prism', 'gem', 'frozen',
];

const SPECIAL_TYPES: BlastTileType[] = ALL_TYPES.filter(t => t !== 'standard');

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
    expect(BLAST_TILE_CONFIGS.wildcard.badgeText).toBe('?');
    expect(BLAST_TILE_CONFIGS.lightning.badgeText).toBe('col');
    expect(BLAST_TILE_CONFIGS.magnet.badgeText).toBe('pull');
    expect(BLAST_TILE_CONFIGS.prism.badgeText).toBe('×2');
    expect(BLAST_TILE_CONFIGS.gem.badgeText).toBe('+3');
    expect(BLAST_TILE_CONFIGS.frozen.badgeText).toBe('×3');
  });
});
