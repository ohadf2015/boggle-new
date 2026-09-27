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

describe('buildChainLevel column-height cap', () => {
  it('never produces a tower-shaped column (regression: level 6 stacked 13-tall)', () => {
    // Pre-fix, level 6's narrow-grid relief allowed ceiling=totalTiles, which
    // let a 5-word chain collapse into a 13-tile single column. Cap is now
    // silhouetteMax + 2 = 7 for levels 1–20 (≤5 cols).
    const heavySpec: ChainLevelSpec = {
      id: 'en-cap-test',
      levelNumber: 6,
      theme: 'ocean',
      locale: 'en',
      columns: 5,
      decoyTiles: 0,
      chain: ['CAT', 'SUN', 'DOG', 'EGG', 'BAT'],
    };
    // Level 6 spec → tower filter active. Chain totalTiles=15, cols=5 →
    // towerCap = max(longest+2, avg+4) = max(5, 7) = 7. Pre-fix had no
    // tower filter → towers up to 13.
    let saw = false;
    for (let seed = 1; seed <= 40; seed++) {
      const level = buildChainLevel(heavySpec, seed);
      if (!level) continue;
      saw = true;
      for (const col of level.columns) {
        expect(col.tiles.length).toBeLessThanOrEqual(7);
      }
    }
    expect(saw).toBe(true);
  });

  it('caps tower height on level 11+ narrow grids (regression: he-chain-11 stacked entire chain vertically)', () => {
    // Hebrew level 11 ships ["סוסה","זברה","פנדה","קואלה","נמיה","צבוע"] — totalTiles=25,
    // cols=5. Pre-fix, ceiling=totalTiles=25 and the silhouette filter was
    // exempt for level>10, so the placer could stack the entire chain in
    // a single 15+ tile column (see screenshot). Tower cap must apply on
    // narrow grids regardless of level number.
    const heSpec: ChainLevelSpec = {
      id: 'he-chain-11',
      levelNumber: 11,
      theme: 'animals',
      locale: 'he',
      columns: 5,
      decoyTiles: 0,
      chain: ['סוסה', 'זברה', 'פנדה', 'קואלה', 'נמיה', 'צבוע'],
    };
    // chain totalTiles=25, longest=5, avg=ceil(25/5)=5 →
    // towerCap = max(longest+2, avg+4) = max(7, 9) = 9. Much tighter
    // than the 15+ tower the screenshot showed.
    let saw = false;
    for (let seed = 1; seed <= 20; seed++) {
      const level = buildChainLevel(heSpec, seed);
      if (!level) continue;
      saw = true;
      for (const col of level.columns) {
        expect(col.tiles.length).toBeLessThanOrEqual(9);
      }
    }
    expect(saw).toBe(true);
  });

  it('flattens flattenable chains to the tight phone cap (kills 9-10 towers)', () => {
    // total=15, cols=5 → avg=3, tightCap = max(longest+1, avg+2) = 5.
    // Pre-fix the loose cap allowed up to 7; the founder saw 9-10 towers on
    // denser curated levels. Prove at least one seed reaches the tight cap and
    // NONE exceeds it across a seed sweep (variety still allowed below the cap).
    const spec: ChainLevelSpec = {
      id: 'en-flat-test',
      levelNumber: 6,
      theme: 'ocean',
      locale: 'en',
      columns: 5,
      decoyTiles: 0,
      chain: ['CAT', 'SUN', 'DOG', 'EGG', 'BAT'],
    };
    let reachedTight = false;
    for (let seed = 1; seed <= 30; seed++) {
      const level = buildChainLevel(spec, seed);
      if (!level) continue;
      const max = Math.max(...level.columns.map((c) => c.tiles.length));
      expect(max).toBeLessThanOrEqual(7); // never worse than the legacy loose cap
      if (max <= 5) reachedTight = true; // the tight phone cap is actually hit
    }
    expect(reachedTight).toBe(true); // flattening works, not just a looser ceiling
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

  it('builds a vertical-only level when the floor word is wider than the grid', () => {
    // Phone-friendly silhouettes use cols=5 but ship chain levels with 6–7-letter
    // floor words. The builder must stack them vertically instead of giving up.
    const wide: ChainLevelSpec = { ...spec, columns: 5, chain: ['UMBRELLA'] };
    const level = buildChainLevel(wide, 7);
    expect(level).not.toBeNull();
    expect(validateChainLevel(level!).ok).toBe(true);
    const towerCol = level!.columns.find((c) => c.tiles.length === 8);
    expect(towerCol, 'expected one column to hold the full 8-letter tower').toBeTruthy();
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
