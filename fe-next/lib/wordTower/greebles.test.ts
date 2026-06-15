import { describe, it, expect } from 'vitest';
import { pickGreeble, GREEBLE_CHANCE } from './greebles';
import type { BlockSurface } from './blockGrade';

const SURFACES: BlockSurface[] = ['windows', 'glass', 'panels', 'greebles', 'facets', 'energy'];

describe('pickGreeble', () => {
  it('is deterministic for a given position + surface', () => {
    for (const s of SURFACES) {
      expect(pickGreeble(42, s)).toEqual(pickGreeble(42, s));
    }
  });

  it('only a minority of tiles sprout a greeble (sparse)', () => {
    let hits = 0;
    const N = 1000;
    for (let pos = 0; pos < N; pos++) if (pickGreeble(pos, 'windows')) hits++;
    const rate = hits / N;
    expect(rate).toBeGreaterThan(0); // not all-null
    expect(rate).toBeLessThan(GREEBLE_CHANCE + 0.06); // roughly the gate, not everywhere
  });

  it('returns valid kinds, sides, and size fractions', () => {
    for (const s of SURFACES) {
      for (let pos = 0; pos < 200; pos++) {
        const g = pickGreeble(pos, s);
        if (!g) continue;
        expect(['antenna', 'strut', 'panel', 'beacon', 'fin']).toContain(g.kind);
        expect(['left', 'right']).toContain(g.side);
        expect(g.sizeFrac).toBeGreaterThanOrEqual(0.18);
        expect(g.sizeFrac).toBeLessThanOrEqual(0.4);
      }
    }
  });

  it('uses biome-appropriate kinds (deep space never gets a city aerial-vs-fin mix wrong)', () => {
    const seen = new Set<string>();
    for (let pos = 0; pos < 500; pos++) {
      const g = pickGreeble(pos, 'energy');
      if (g) seen.add(g.kind);
    }
    // energy surface only emits from its allowed set
    for (const k of seen) expect(['beacon', 'antenna']).toContain(k);
  });
});
