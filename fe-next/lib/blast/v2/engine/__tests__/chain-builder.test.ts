import { describe, it, expect } from 'vitest';
import { insertWord } from '../chain-builder';
import { collapseCells } from '../collapse';
import { scanFormableThemeWords } from '../word-scan';
import type { BlastLevel } from '../../types';

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
