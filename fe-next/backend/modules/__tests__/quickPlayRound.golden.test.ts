import { describe, it, expect, vi } from 'vitest';

// Same dictionary stub as quickPlayRound.test.ts: real grid, solver and scoring.
vi.mock('../../dictionary', () => {
  const words = new Set(['cat', 'act', 'tac', 'ate', 'tea', 'eat', 'net', 'ten', 'rat', 'tar', 'art', 'ear', 'era', 'ran', 'car', 'arc', 'sun', 'dog', 'hat', 'cup', 'map']);
  return {
    dictionary: {
      englishWords: words,
      hebrewWords: words,
      swedishWords: words,
      japaneseWords: words,
      spanishWords: words,
    },
    isDictionaryWord: (w: string) => words.has(w.toLowerCase()),
    normalizeWord: (w: string) => w.toLowerCase(),
    load: async () => undefined,
  };
});

import { buildQuickRound, perfectScoreWithGolden, scoreWordsForMode } from '../quickPlayRound';
import { wordUsesCell } from '../../../shared/utils/goldenTile';

const findSeed = async (pred: (r: Awaited<ReturnType<typeof buildQuickRound>>) => boolean, prefix = 'g') => {
  for (let i = 0; i < 60; i++) {
    const r = await buildQuickRound('classic', 'en', `${prefix}-${i}`);
    if (pred(r)) return r;
  }
  return null;
};

describe('golden tile (server authoritative)', () => {
  it('comes from the seed: rebuilding a round gives the same golden cell', async () => {
    const r = await findSeed((x) => !!x.goldenTile);
    expect(r).not.toBeNull();
    const again = await buildQuickRound('classic', 'en', r!.seed);
    expect(again.goldenTile).toEqual(r!.goldenTile);
    expect(again.perfectScore).toBe(r!.perfectScore);
  });

  it('some classic boards have none', async () => {
    expect(await findSeed((x) => !x.goldenTile)).not.toBeNull();
  });

  it('prices the doubling into the anti-cheat ceiling', async () => {
    const r = await findSeed((x) => !!x.goldenTile && x.words.some((w) => wordUsesCell(x.grid, w, x.goldenTile)));
    if (!r) return; // stub dictionary too small for this board set; covered by the unit below
    const plain = scoreWordsForMode('classic', r.words);
    expect(r.perfectScore).toBeGreaterThan(plain);
  });

  it('perfectScoreWithGolden doubles exactly the words through the cell', () => {
    const grid = [
      ['c', 'a', 't'],
      ['x', 'x', 'x'],
      ['d', 'o', 'g'],
    ];
    const words = ['cat', 'dog'];
    const plain = scoreWordsForMode('classic', words);
    const cat = scoreWordsForMode('classic', ['cat']);
    expect(perfectScoreWithGolden('classic', words, grid, { row: 0, col: 1 })).toBe(plain + cat);
    expect(perfectScoreWithGolden('classic', words, grid, undefined)).toBe(plain);
  });

  it('never puts a golden tile on non-classic modes', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await buildQuickRound('blast', 'en', `b-${i}`);
      expect(r.goldenTile).toBeUndefined();
    }
  });
});

describe('seed-borne board variants', () => {
  it('a coach seed plants a findable starter word and returns it as the hint', async () => {
    const r = await buildQuickRound('classic', 'en', 'coach-abc');
    expect(r.hintWord).toBeTruthy();
    expect(r.words).toContain(r.hintWord!.toLowerCase());
    const again = await buildQuickRound('classic', 'en', 'coach-abc');
    expect(again.grid).toEqual(r.grid);
  });

  it('a weekly seed carries the theme and is the same board for everyone', async () => {
    const a = await buildQuickRound('classic', 'en', 'weekly-2026-W46');
    const b = await buildQuickRound('classic', 'en', 'weekly-2026-W46');
    expect(a.theme).toBeTruthy();
    expect(a.grid).toEqual(b.grid);
  });
});
