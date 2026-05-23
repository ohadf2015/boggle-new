import { describe, it, expect } from 'vitest';
import { gradeBlockColor, blockSurface, blockMaterial } from '../blockGrade';
import { wordColor, hexToHsl } from '../towerColumn';
import { WORD_TOWER_BIOMES } from '@/shared/constants/wordTowerConstants';

/** Max per-channel distance between two packed RGB ints. */
function channelDist(a: number, b: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return Math.max(Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb));
}

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
    for (let i = 0; i < 8; i++) {
      const base = wordColor(i);
      const cityL = hexToHsl(gradeBlockColor(base, 'city')).l;
      const orbitL = hexToHsl(gradeBlockColor(base, 'orbit')).l;
      const galaxyL = hexToHsl(gradeBlockColor(base, 'galaxy')).l;
      expect(orbitL).toBeLessThan(cityL);
      expect(galaxyL).toBeLessThanOrEqual(orbitL);
    }
  });

  it('is EXACTLY one colour per zone — word hue ignored entirely (founder: stick to one colour per surface)', () => {
    // Any word colour graded into a zone yields the identical material — no
    // per-word drift at all, so a zone reads as a single flat building colour.
    for (const { id } of WORD_TOWER_BIOMES) {
      const ref = gradeBlockColor(0xff0000, id);
      for (const base of [0x00ff00, 0x0000ff, 0xffffff, 0x000000, 0xbfff00, wordColor(7)]) {
        expect(gradeBlockColor(base, id)).toBe(ref);
      }
    }
  });

  it('that one colour is the zone material', () => {
    for (const { id } of WORD_TOWER_BIOMES) {
      expect(gradeBlockColor(wordColor(3), id)).toBe(blockMaterial(id));
    }
  });

  it('keeps every zone desaturated / mature, never candy-bright', () => {
    for (const { id } of WORD_TOWER_BIOMES) {
      for (let i = 0; i < 6; i++) {
        const s = hexToHsl(gradeBlockColor(wordColor(i), id)).s;
        expect(s).toBeLessThan(0.5); // muted building material, not childish
      }
    }
  });

  it('materials darken monotonically with altitude (clean light city → dark space climb)', () => {
    const ls = WORD_TOWER_BIOMES.map((b) => hexToHsl(blockMaterial(b.id)).l);
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i]!).toBeLessThanOrEqual(ls[i - 1]! + 1e-6);
    }
  });

  it('gives each zone a distinct material look (adjacent zones differ clearly)', () => {
    const base = wordColor(2);
    const ids = WORD_TOWER_BIOMES.map((b) => b.id);
    for (let i = 1; i < ids.length; i++) {
      expect(channelDist(gradeBlockColor(base, ids[i - 1]!), gradeBlockColor(base, ids[i]!))).toBeGreaterThan(12);
    }
  });
});

describe('blockSurface', () => {
  it('maps each zone to its own structure — city windows … deep space energy (spacy)', () => {
    expect(blockSurface('city')).toBe('windows');
    expect(blockSurface('sky')).toBe('glass');
    expect(blockSurface('stratosphere')).toBe('panels');
    expect(blockSurface('orbit')).toBe('greebles');
    expect(blockSurface('nebula')).toBe('facets');
    expect(blockSurface('galaxy')).toBe('energy');
  });

  it('returns a known surface for every defined biome', () => {
    const known = ['windows', 'glass', 'panels', 'greebles', 'facets', 'energy'];
    for (const { id } of WORD_TOWER_BIOMES) {
      expect(known).toContain(blockSurface(id));
    }
  });
});
