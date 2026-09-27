import { describe, it, expect } from 'vitest';
import { validateChainLevel } from '../chain-validator';
import { buildChainLevel } from '../chain-builder';
import type { BlastLevel, ChainLevelSpec } from '../../types';

const spec: ChainLevelSpec = {
  id: 'en-chain-01',
  levelNumber: 1,
  theme: 'onboarding',
  locale: 'en',
  columns: 4,
  decoyTiles: 0,
  chain: ['CAT', 'SUN', 'EGG'],
};

describe('validateChainLevel', () => {
  it('accepts a level built by buildChainLevel', () => {
    const level = buildChainLevel(spec, 7)!;
    const result = validateChainLevel(level);
    expect(result.ok).toBe(true);
  });

  it('rejects a level where a later word is formable too early', () => {
    const bad: BlastLevel = {
      ...spec,
      words: ['CAT', 'SUN'],
      resolvableOrder: ['CAT', 'SUN'],
      tileFlags: {},
      difficulty: 1,
      columns: [
        { index: 0, tiles: ['C', 'S'] },
        { index: 1, tiles: ['A', 'U'] },
        { index: 2, tiles: ['T', 'N'] },
        { index: 3, tiles: [] },
      ],
    };
    const result = validateChainLevel(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/step 1/i);
    }
  });

  it('rejects a level whose board does not empty after the last word', () => {
    const bad: BlastLevel = {
      ...spec,
      words: ['CAT'],
      resolvableOrder: ['CAT'],
      tileFlags: {},
      difficulty: 1,
      columns: [
        { index: 0, tiles: ['C'] },
        { index: 1, tiles: ['A'] },
        { index: 2, tiles: ['T'] },
        { index: 3, tiles: ['Z'] },
      ],
    };
    const result = validateChainLevel(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/leftover/i);
    }
  });

  it('rejects a level where the expected word is formable in two placements', () => {
    const bad: BlastLevel = {
      id: 'en-chain-dup',
      levelNumber: 1,
      theme: 'onboarding',
      locale: 'en',
      words: ['CAT'],
      resolvableOrder: ['CAT'],
      tileFlags: {},
      difficulty: 1,
      columns: [
        { index: 0, tiles: ['C'] },
        { index: 1, tiles: ['A'] },
        { index: 2, tiles: ['T'] },
        { index: 3, tiles: ['C'] },
        { index: 4, tiles: ['A'] },
        { index: 5, tiles: ['T'] },
      ],
    };
    const result = validateChainLevel(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/multiple placements/i);
    }
  });
});
