import { describe, it, expect } from 'vitest';
import { gradeBlockColor, blockSurface } from '../blockGrade';
import { wordColor, hexToHsl } from '../towerColumn';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';

describe('gradeBlockColor', () => {
  it('is deterministic per (colour, biome)', () => {
    expect(gradeBlockColor(0xbfff00, 'orbit')).toBe(gradeBlockColor(0xbfff00, 'orbit'));
    expect(gradeBlockColor(wordColor(3), 'nebula')).toBe(gradeBlockColor(wordColor(3), 'nebula'));
  });

  it('returns a valid 24-bit colour for every biome', () => {
    for (const { id } of WORD_TOWER_BIOMES) {
      for (let i = 0; i < 12; i++) {
        const c = gradeBlockColor(wordColor(i), id);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(0xffffff);
      }
    }
  });

  it('darkens blocks as the climb rises (space zones are dimmer than the city)', () => {
    // The user wants tiles to "look more spacy" up high → progressively darker.
    for (let i = 0; i < 8; i++) {
      const base = wordColor(i);
      const cityL = hexToHsl(gradeBlockColor(base, 'city')).l;
      const orbitL = hexToHsl(gradeBlockColor(base, 'orbit')).l;
      const galaxyL = hexToHsl(gradeBlockColor(base, 'galaxy')).l;
      expect(orbitL).toBeLessThan(cityL);
      expect(galaxyL).toBeLessThanOrEqual(orbitL);
    }
  });

  it('keeps adjacent words distinguishable within the same biome (hue variety survives the grade)', () => {
    const a = hexToHsl(gradeBlockColor(wordColor(0), 'orbit')).h;
    const b = hexToHsl(gradeBlockColor(wordColor(1), 'orbit')).h;
    const arc = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    expect(arc).toBeGreaterThan(25); // not collapsed onto a single biome hue
  });

  it('pulls neighbouring biomes toward distinct looks (city vs sky differ)', () => {
    const base = wordColor(2);
    const city = gradeBlockColor(base, 'city');
    const sky = gradeBlockColor(base, 'sky');
    expect(city).not.toBe(sky);
  });
});

describe('blockSurface', () => {
  it('low zones wear windows, mid zones panels, deep space facets', () => {
    expect(blockSurface('city')).toBe('windows');
    expect(blockSurface('sky')).toBe('windows');
    expect(blockSurface('stratosphere')).toBe('panels');
    expect(blockSurface('orbit')).toBe('panels');
    expect(blockSurface('nebula')).toBe('facets');
    expect(blockSurface('galaxy')).toBe('facets');
  });

  it('returns a surface for every defined biome', () => {
    for (const { id } of WORD_TOWER_BIOMES) {
      expect(['windows', 'panels', 'facets']).toContain(blockSurface(id));
    }
  });
});
