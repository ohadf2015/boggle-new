import { describe, it, expect } from 'vitest';
import { insertWord, buildChainLevel } from '../chain-builder';
import { collapseCells } from '../collapse';
import { scanFormableThemeWords } from '../word-scan';
import { validateChainLevel } from '../chain-validator';
import type { BlastColumn, BlastLevel, ChainLevelSpec } from '../../types';

function lvl(columns: string[][]): BlastLevel {
  return {
    id: 't',
    levelNumber: 1,
    theme: 'onboarding',
    locale: 'en',
    words: [],
    resolvableOrder: [],
    tileFlags: {},
    difficulty: 1,
    columns: columns.map((tiles, index) => ({ index, tiles })),
  };
}

describe('insertWord', () => {
  it('inserts a word so only it is formable, and removing it restores the prior board', () => {
    const Sk = lvl([['D'], ['X'], ['G'], ['Y']]);
    const result = insertWord(Sk, 'CAT', ['DXG'], 'en', 1);
    expect(result).not.toBeNull();
    const S = result!.level;

    const matches = scanFormableThemeWords(S, ['CAT', 'DXG'], 'en');
    expect(matches.map((m) => m.word).sort()).toEqual(['CAT']);

    const after = collapseCells(S, result!.cells);
    expect(after.level.columns.map((c) => c.tiles)).toEqual(Sk.columns.map((c) => c.tiles));
  });

  it('returns null when no placement isolates the word', () => {
    const Sk = lvl([['X']]);
    const result = insertWord(Sk, 'CAT', ['XYZ'], 'en', 1);
    expect(result).toBeNull();
  });

  it('is deterministic for a given seed', () => {
    const Sk = lvl([['D'], ['O'], ['G']]);
    const a = insertWord(Sk, 'CAT', ['DOG'], 'en', 42);
    const b = insertWord(Sk, 'CAT', ['DOG'], 'en', 42);
    expect(a?.level.columns).toEqual(b?.level.columns);
  });
});

describe('buildChainLevel', () => {
  const spec: ChainLevelSpec = {
    id: 'en-chain-01',
    levelNumber: 1,
    theme: 'onboarding',
    locale: 'en',
    columns: 4,
    decoyTiles: 0,
    chain: ['CAT', 'SUN', 'EGG'],
  };

  it('produces a level whose forward replay matches the chain', () => {
    const level = buildChainLevel(spec, 7);
    expect(level).not.toBeNull();
    expect(level!.words).toEqual(['CAT', 'SUN', 'EGG']);
    expect(level!.resolvableOrder).toEqual(['CAT', 'SUN', 'EGG']);
    expect(validateChainLevel(level!).ok).toBe(true);
  });

  it('column count matches the spec', () => {
    const level = buildChainLevel(spec, 7);
    expect(level!.columns.length).toBe(4);
  });

  it('returns null for an impossible chain (word longer than columns)', () => {
    const bad: ChainLevelSpec = { ...spec, columns: 2, chain: ['CAT'] };
    expect(buildChainLevel(bad, 7)).toBeNull();
  });

  it('inserts the requested number of decoy tiles when possible', () => {
    const withDecoys: ChainLevelSpec = { ...spec, columns: 8, decoyTiles: 1 };
    const level = buildChainLevel(withDecoys, 99);
    if (level) {
      const totalTiles = level.columns.reduce((n: number, c: BlastColumn) => n + c.tiles.length, 0);
      const wordTiles = spec.chain.join('').length;
      expect(totalTiles).toBe(wordTiles + 1);
      expect(validateChainLevel(level).ok).toBe(true);
    }
  });

});
