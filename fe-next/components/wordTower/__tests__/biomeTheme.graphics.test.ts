/**
 * Biome graphic identity — each zone must ship richer backdrop props than a
 * pure colour remap (vignette, ground fog, accent glow, skyline tint).
 */
import { describe, it, expect } from 'vitest';
import { BIOME_THEME } from '../biomeTheme';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';

const ids = WORD_TOWER_BIOMES.map((b) => b.id);

describe('BIOME_THEME graphic enrichment', () => {
  it('every biome has a backdrop vignette strength 0..1', () => {
    for (const id of ids) {
      const v = BIOME_THEME[id].vignette;
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('every biome has a groundFog opacity and accentGlow CSS colour string', () => {
    for (const id of ids) {
      expect(BIOME_THEME[id].groundFog).toBeGreaterThanOrEqual(0);
      expect(BIOME_THEME[id].groundFog).toBeLessThanOrEqual(1);
      expect(BIOME_THEME[id].accentGlow).toMatch(/^(rgba?\(|#|linear-gradient|radial-gradient)/);
    }
  });

  it('space biomes are denser (stars + vignette) than city', () => {
    expect(BIOME_THEME.galaxy.stars).toBeGreaterThan(BIOME_THEME.city.stars);
    expect(BIOME_THEME.galaxy.vignette).toBeGreaterThan(BIOME_THEME.city.vignette);
  });

  it('every biome lists at least one native prop and event type', () => {
    for (const id of ids) {
      expect((BIOME_THEME[id].nativePropIds ?? []).length).toBeGreaterThan(0);
      expect((BIOME_THEME[id].eventTypes ?? []).length).toBeGreaterThan(0);
    }
  });
});
