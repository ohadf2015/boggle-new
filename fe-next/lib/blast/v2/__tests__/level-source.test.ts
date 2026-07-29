import { describe, it, expect } from 'vitest';
import { getLevelSource, CURATED_LEVEL_CUTOFF, type LevelSourceRegistry } from '../level-source';

describe('LevelSource', () => {
  const mockRegistry: LevelSourceRegistry = {
    curated: {
      resolve: async (n, locale) => ({
        id: 'curated', levelNumber: n, theme: 'fruits', locale,
        words: ['TEST'], columns: [], resolvableOrder: ['TEST'],
        tileFlags: {}, difficulty: n,
      }),
    },
    generated: {
      resolve: async (n, locale) => ({
        id: 'generated', levelNumber: n, theme: 'fruits', locale,
        words: ['TEST'], columns: [], resolvableOrder: ['TEST'],
        tileFlags: {}, difficulty: n,
      }),
    },
  };

  it('getLevelSource(15) returns curated', () => {
    expect(getLevelSource(15, mockRegistry)).toBe(mockRegistry.curated);
  });

  it('getLevelSource(31) returns generated', () => {
    expect(getLevelSource(31, mockRegistry)).toBe(mockRegistry.generated);
  });

  it('CURATED_LEVEL_CUTOFF is 30', () => {
    expect(CURATED_LEVEL_CUTOFF).toBe(30);
  });
});
