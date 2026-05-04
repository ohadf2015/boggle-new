import { describe, it, expect } from 'vitest';
import { TILE_ACCENTS } from '../blastTileVisuals';

describe('TILE_ACCENTS', () => {
  it('has accent quad for every BlastTileType', () => {
    const types = Object.keys(TILE_ACCENTS) as Array<keyof typeof TILE_ACCENTS>;
    expect(types.length).toBeGreaterThan(0);
    for (const type of types) {
      const accent = TILE_ACCENTS[type];
      expect(accent, `missing accent for ${String(type)}`).toBeDefined();
      expect(accent.glossTop).toMatch(/^rgba?\(/);
      expect(accent.rimLight).toMatch(/^rgba?\(/);
      expect(accent.rimDark).toMatch(/^rgba?\(/);
      expect(accent.castShadow).toMatch(/^rgba?\(/);
    }
  });

  it('standard tile has neutral cream accent', () => {
    expect(TILE_ACCENTS.standard.glossTop).toBe('rgba(255,255,255,0.55)');
  });
});
