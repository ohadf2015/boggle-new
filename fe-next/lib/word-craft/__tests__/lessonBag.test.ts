import { describe, it, expect } from 'vitest';
import {
  lessonTargetsFor,
  wordCraftLocaleFor,
  seedOpeningRack,
  drawTowardTarget,
  nextLessonTarget,
} from '../lessonBag';
import { createBag, getTileBag } from '../tileBag';
import { buildInitialState, wordCraftReducer } from '../useWordCraftGame';
import type { RackTile } from '../types';

/**
 * Word Craft as classroom homework: the deal must make the lesson's words
 * buildable. A lesson word is seedable iff every letter of its canonical form
 * (sofit folded, accents folded, uppercased) is a tile in that locale's bag.
 */
const letters = (tiles: readonly RackTile[]) => tiles.map((t) => t.letter).sort().join('');
const sorted = (w: string) => [...w].sort().join('');
const containsAll = (tiles: readonly RackTile[], word: string) => {
  const pool = tiles.map((t) => t.letter);
  for (const ch of word) {
    const i = pool.indexOf(ch);
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  return true;
};

describe('wordCraftLocaleFor', () => {
  it('Given a lesson language with a bag, When resolved, Then the LESSON language wins over the UI', () => {
    expect(wordCraftLocaleFor('he', 'en')).toEqual({ locale: 'he', seeded: true });
    expect(wordCraftLocaleFor('es', 'ja')).toEqual({ locale: 'es', seeded: true });
  });

  it('Given a Russian lesson (no Word Craft bag/dictionary), When resolved, Then it falls back to the UI locale UNSEEDED', () => {
    expect(wordCraftLocaleFor('ru', 'sv')).toEqual({ locale: 'sv', seeded: false });
    expect(wordCraftLocaleFor('ru', 'ru')).toEqual({ locale: 'en', seeded: false });
  });
});

describe('lessonTargetsFor', () => {
  it('Given Hebrew words with final forms, When targeted, Then they fold to the regular tiles the bag holds', () => {
    // שלום ends in ם (final mem); the he bag has only regular מ.
    expect(lessonTargetsFor(['שלום'], 'he')).toEqual(['שלומ']);
    const he = getTileBag('he').values;
    for (const ch of lessonTargetsFor(['שלום'], 'he')[0]) expect(he[ch]).toBeDefined();
  });

  it('Given accented Spanish words, When targeted, Then accents fold but Ñ survives', () => {
    expect(lessonTargetsFor(['está', 'año'], 'es')).toEqual(['AÑO', 'ESTA']);
  });

  it('Given Japanese katakana / kanji, When targeted, Then they are skipped (no such tiles), hiragana kept', () => {
    expect(lessonTargetsFor(['ネコ', '猫', 'ねこ'], 'ja')).toEqual(['ねこ']);
  });

  it('Given words longer than a rack, duplicates and one-letter words, When targeted, Then only rack-sized ones remain, shortest first, once each', () => {
    expect(lessonTargetsFor(['elephant', 'Tree', 'cat', 'CAT', 'a'], 'en')).toEqual(['CAT', 'TREE']);
  });
});

describe('seedOpeningRack', () => {
  it('Given no target, When seeded, Then the bag is returned unchanged (no lesson = today)', () => {
    const bag = createBag({ seed: 7, locale: 'en' });
    const before = bag.tiles.map((t) => `${t.id}:${t.letter}`);
    expect(seedOpeningRack(bag.tiles, null, 'en').map((t) => `${t.id}:${t.letter}`)).toEqual(before);
  });

  it('Given a target, When seeded, Then its letters lead the bag and the tile COUNT is unchanged', () => {
    const bag = createBag({ seed: 7, locale: 'en', bagSize: 60 });
    const out = seedOpeningRack(bag.tiles, 'TREE', 'en');
    expect(out).toHaveLength(bag.tiles.length);
    expect(sorted(out.slice(0, 4).map((t) => t.letter).join(''))).toBe(sorted('TREE'));
  });

  it('Given a letter the (scaled) bag lacks, When seeded, Then a spare tile is re-lettered rather than the bag growing', () => {
    const tiles: RackTile[] = [...'AAAAAAAAAA'].map((l, i) => ({ id: `t-${i}`, letter: l, value: 1, isBlank: false }));
    const out = seedOpeningRack(tiles, 'ZAX', 'en');
    expect(out).toHaveLength(10);
    expect(sorted(out.slice(0, 3).map((t) => t.letter).join(''))).toBe(sorted('ZAX'));
    expect(out.find((t) => t.letter === 'Z')?.value).toBe(getTileBag('en').values.Z);
  });
});

describe('drawTowardTarget', () => {
  const tile = (l: string, i: number): RackTile => ({ id: `b-${i}`, letter: l, value: 1, isBlank: false });

  it('Given no target, When drawing, Then it draws from the front exactly as the stock refill does', () => {
    const bag = [...'QWERTY'].map(tile);
    const { drawn, rest } = drawTowardTarget(bag, 3, [], null, 'en');
    expect(drawn.map((t) => t.letter)).toEqual(['Q', 'W', 'E']);
    expect(rest.map((t) => t.letter)).toEqual(['R', 'T', 'Y']);
  });

  it('Given a target, When drawing, Then the letters the rack is missing come first', () => {
    const bag = [...'QQQQDOG'].map(tile);
    const rack = [tile('D', 99)];
    const { drawn, rest } = drawTowardTarget(bag, 3, rack, 'DOG', 'en');
    expect(letters(drawn)).toBe(sorted('OGQ'));
    expect(drawn).toHaveLength(3);
    expect(rest).toHaveLength(4);
  });
});

describe('nextLessonTarget', () => {
  it('Given targets and history, When asked, Then it is the first target the PLAYER has not built', () => {
    const history = [
      { who: 'bot' as const, words: ['CAT'] },
      { who: 'player' as const, words: ['TREE'] },
    ];
    expect(nextLessonTarget(['CAT', 'TREE', 'HOUSE'], history)).toBe('CAT');
    expect(nextLessonTarget(['TREE', 'HOUSE'], history)).toBe('HOUSE');
    expect(nextLessonTarget(['TREE'], history)).toBeNull();
    expect(nextLessonTarget(undefined, history)).toBeNull();
  });
});

describe('buildInitialState with lesson targets', () => {
  it('Given no lesson, When dealt, Then racks and bag are identical to the stock deal', () => {
    const a = buildInitialState({ seed: 42, locale: 'en' });
    const b = buildInitialState({ seed: 42, locale: 'en', lessonTargets: [] });
    expect(b.player.rack).toEqual(a.player.rack);
    expect(b.bot.rack).toEqual(a.bot.rack);
    expect(b.bag.tiles).toEqual(a.bag.tiles);
  });

  it('Given a Hebrew lesson, When dealt, Then the player opens holding every letter of the first target', () => {
    const [target] = lessonTargetsFor(['שלום'], 'he');
    for (let seed = 1; seed <= 20; seed++) {
      const s = buildInitialState({ seed, locale: 'he', lessonTargets: [target], modifierOverride: 'none' });
      expect(containsAll(s.player.rack, target)).toBe(true);
      expect(s.player.rack).toHaveLength(7);
    }
  });

  it('Given a lesson, When the player commits, Then the refill brings the NEXT target letters (bot refills untouched)', () => {
    const s0 = buildInitialState({ seed: 3, locale: 'en', lessonTargets: ['CAT', 'DOG'], modifierOverride: 'none' });
    const placed = s0.player.rack.filter((t) => 'CAT'.includes(t.letter)).slice(0, 3);
    const s1 = wordCraftReducer(s0, {
      type: 'COMMIT_PLAYER',
      placements: placed.map((t, i) => ({ row: 7, col: 6 + i, letter: t.letter, value: t.value, isBlank: false, rackTileId: t.id })),
      score: 5,
      words: ['CAT'],
      wordCells: [placed.map((_, i) => ({ row: 7, col: 6 + i }))],
    });
    expect(containsAll(s1.player.rack, 'DOG')).toBe(true);
  });

  it('Given a lesson, When the game is RESET (play again), Then the seeding survives', () => {
    const s0 = buildInitialState({ seed: 3, locale: 'en', lessonTargets: ['ZAX'], modifierOverride: 'none' });
    const s1 = wordCraftReducer(s0, { type: 'RESET', seed: 9, boardSize: 15, locale: 'en', modifierOverride: 'none' });
    expect(containsAll(s1.player.rack, 'ZAX')).toBe(true);
  });
});
