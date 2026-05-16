import { describe, it, expect } from 'vitest';
import { insertWord, insertWordVertical, buildChainLevel } from '../chain-builder';
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

describe('insertWordVertical', () => {
  it('inserts the word as a single-column vertical run so only it is formable', () => {
    // Two single-tile columns leave room for a 3-tall vertical insert in
    // either column. Letters must be placed so reading TOP-DOWN spells the word
    // (engine word-scan reads vertical runs top-down).
    const Sk = lvl([['Z'], ['Q']]);
    const result = insertWordVertical(Sk, 'CAT', ['ZQ'], 'en', 1);
    expect(result).not.toBeNull();
    const S = result!.level;

    const matches = scanFormableThemeWords(S, ['CAT', 'ZQ'], 'en');
    expect(matches.map((m) => m.word).sort()).toEqual(['CAT']);

    // All 3 inserted cells share a single column.
    const cols = new Set(result!.cells.map((c) => c.match(/^c(\d+)r/)![1]));
    expect(cols.size).toBe(1);

    // Removing those cells must restore the prior board.
    const after = collapseCells(S, result!.cells);
    expect(after.level.columns.map((c) => c.tiles)).toEqual(Sk.columns.map((c) => c.tiles));
  });

  it('returns null when the word is longer than the available vertical headroom', () => {
    // Board is 1-col but a 3-letter word needs 3 stacked cells; should still fit
    // since headroom is unbounded. With 0 cols the word never fits.
    const Sk = lvl([]);
    expect(insertWordVertical(Sk, 'CAT', [], 'en', 1)).toBeNull();
  });

  it('is deterministic for a given seed', () => {
    const Sk = lvl([['D'], ['O'], ['G']]);
    const a = insertWordVertical(Sk, 'CAT', ['DOG'], 'en', 42);
    const b = insertWordVertical(Sk, 'CAT', ['DOG'], 'en', 42);
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

  it('returns null when decoyTiles > 0 — decoys are currently unsupported', () => {
    // A non-word decoy tile can never be cleared by the forced chain, so it
    // is always "leftover" and fails validateChainLevel's empty-board check.
    // Decoys are deferred until the win condition or placement model changes.
    // When decoy support lands, replace this with a real placement assertion.
    const withDecoys: ChainLevelSpec = { ...spec, columns: 8, decoyTiles: 1 };
    expect(buildChainLevel(withDecoys, 99)).toBeNull();
  });

  it('spreads tiles horizontally — no column exceeds longestWord + 1', () => {
    // Regression guard: chain-pack levels were stacking multiple vertical
    // insertions in the same column, producing 8+ tile-tall single columns
    // (e.g. he/lvl-9 with all four words piled on the rightmost column).
    // The placement balancer must keep column heights at most
    // `longestWord.length + 1` so the board reads as a spread silhouette,
    // not a tower.
    const balanceSpec: ChainLevelSpec = {
      id: 'he-chain-9-balance',
      levelNumber: 9,
      theme: 'fruits',
      locale: 'he',
      columns: 7,
      decoyTiles: 0,
      chain: ['תפוז', 'בננה', 'מנגו', 'לימונ'],
    };
    const longest = Math.max(...balanceSpec.chain.map((w) => [...w].length));
    const ceiling = longest + 1; // 5 + 1 = 6 for he/lvl 9
    let any = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const level = buildChainLevel(balanceSpec, seed);
      if (!level) continue;
      any++;
      for (const col of level.columns) {
        expect(col.tiles.length).toBeLessThanOrEqual(ceiling);
      }
    }
    expect(any).toBeGreaterThan(0); // at least some seeds must succeed
  });

  it('produces at least one vertical placement across many seeds (chain not all horizontal)', () => {
    // With horizontal+vertical insertion both available, sweep seeds; at least
    // one resulting level must contain a column whose tiles spell one of the
    // chain words top-down — the only way that happens is a vertical insert,
    // since horizontal stacking puts only one letter from each word per column.
    const verticalSpec: ChainLevelSpec = {
      id: 'en-chain-vert-test',
      levelNumber: 1,
      theme: 'onboarding',
      locale: 'en',
      columns: 6,
      decoyTiles: 0,
      chain: ['CAT', 'SUN', 'EGG'],
    };
    let sawVerticalWord = false;
    for (let seed = 1; seed <= 80; seed++) {
      const level = buildChainLevel(verticalSpec, seed);
      if (!level) continue;
      for (const col of level.columns) {
        for (const w of verticalSpec.chain) {
          const L = w.length;
          for (let r = 0; r + L <= col.tiles.length; r++) {
            // word-scan reads vertical runs top-down: tiles[r+L-1]..tiles[r].
            const topDown = col.tiles.slice(r, r + L).reverse().join('');
            if (topDown === w) sawVerticalWord = true;
          }
        }
      }
      if (sawVerticalWord) break;
    }
    expect(sawVerticalWord).toBe(true);
  });

});
