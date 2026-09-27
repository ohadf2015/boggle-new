/**
 * Word Tower — greeble/surface accent ↔ biome accent drift guard (Phase 2).
 *
 * SURFACE_ACCENT (keyed by the per-tile decoration kind) must stay in lock-step
 * with BIOME_THEME[*].greebleAccent (keyed by biome id), since decoration kind is
 * 1:1 with biome. This test fails the moment one is changed without the other.
 */
import { describe, it, expect } from 'vitest';
import { SURFACE_ACCENT } from '../towerSprites';
import { BIOME_THEME } from '../biomeTheme';
import type { BlockSurface } from '@/lib/wordTower/blockGrade';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

// Decoration kind → biome it belongs to (see drawBlockSurface branches).
const SURFACE_TO_BIOME: Record<BlockSurface, WordTowerBiomeId> = {
  windows: 'city',
  glass: 'sky',
  panels: 'stratosphere',
  greebles: 'orbit',
  facets: 'nebula',
  energy: 'galaxy',
};

describe('SURFACE_ACCENT', () => {
  it('covers every decoration kind', () => {
    for (const surface of Object.keys(SURFACE_TO_BIOME) as BlockSurface[]) {
      expect(typeof SURFACE_ACCENT[surface]).toBe('number');
    }
  });

  it('matches the biome greebleAccent it maps to', () => {
    for (const [surface, biome] of Object.entries(SURFACE_TO_BIOME) as [BlockSurface, WordTowerBiomeId][]) {
      expect(SURFACE_ACCENT[surface]).toBe(BIOME_THEME[biome].greebleAccent);
    }
  });
});
