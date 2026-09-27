/**
 * Word Tower — biome identity theme (Phase 2).
 *
 * Each biome must be more than a block-colour remap: it carries its OWN particle
 * palette, signature glint, greeble accent, and ambient wind/difficulty feel.
 * These tests pin the data invariants so a biome can never ship half-themed.
 */
import { describe, it, expect } from 'vitest';
import { BIOME_THEME } from '../biomeTheme';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';

const ids = WORD_TOWER_BIOMES.map((b) => b.id);
const isHexColor = (n: number) => Number.isInteger(n) && n >= 0 && n <= 0xffffff;

describe('BIOME_THEME identity fields', () => {
  it('defines a theme for every biome', () => {
    for (const id of ids) {
      expect(BIOME_THEME[id]).toBeDefined();
    }
  });

  it('every biome has a non-empty particle palette of valid hex colours', () => {
    for (const id of ids) {
      const pal = BIOME_THEME[id].particles;
      expect(Array.isArray(pal)).toBe(true);
      expect(pal.length).toBeGreaterThanOrEqual(2);
      for (const c of pal) expect(isHexColor(c)).toBe(true);
    }
  });

  it('every biome has a valid glint + greebleAccent colour', () => {
    for (const id of ids) {
      expect(isHexColor(BIOME_THEME[id].glint)).toBe(true);
      expect(isHexColor(BIOME_THEME[id].greebleAccent)).toBe(true);
    }
  });

  it('wind + instability multipliers sit in a sane range', () => {
    for (const id of ids) {
      expect(BIOME_THEME[id].windMult).toBeGreaterThanOrEqual(0.5);
      expect(BIOME_THEME[id].windMult).toBeLessThanOrEqual(2.5);
      expect(BIOME_THEME[id].instabilityMult).toBeGreaterThanOrEqual(1);
      expect(BIOME_THEME[id].instabilityMult).toBeLessThanOrEqual(1.6);
    }
  });

  it('difficulty (instability + wind) is non-decreasing as you climb city→galaxy', () => {
    // ids are defined ground→space; the higher you go, the more exposed it feels.
    for (let i = 1; i < ids.length; i++) {
      expect(BIOME_THEME[ids[i]].instabilityMult).toBeGreaterThanOrEqual(
        BIOME_THEME[ids[i - 1]].instabilityMult,
      );
      expect(BIOME_THEME[ids[i]].windMult).toBeGreaterThanOrEqual(BIOME_THEME[ids[i - 1]].windMult);
    }
  });

  it('city is the calm baseline (instability + wind == 1.0)', () => {
    expect(BIOME_THEME.city.instabilityMult).toBeCloseTo(1, 6);
    expect(BIOME_THEME.city.windMult).toBeCloseTo(1, 6);
  });
});
