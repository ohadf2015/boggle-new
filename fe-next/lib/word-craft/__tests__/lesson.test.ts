import { describe, it, expect } from 'vitest';
import { lessonTargets, lessonDraw, foundLessonWords, nextLessonTarget } from '../lesson';
import type { RackTile } from '../types';

const tile = (letter: string, i: number): RackTile => ({ id: `t${i}`, letter, value: 1, isBlank: false });
const tiles = (letters: string) => Array.from(letters).map(tile);

describe('lessonTargets', () => {
  it('Given raw teacher words, Then they are canonical, deduped, and rack-sized', () => {
    expect(lessonTargets(['cat', 'Cat ', 'a', 'elephants', 'dog'], 'en')).toEqual(['CAT', 'DOG']);
  });

  it('Given Hebrew words with final forms, Then targets use the regular letters the tiles actually carry', () => {
    // שלום ends in a final mem (ם); the Hebrew bag only has regular מ.
    expect(lessonTargets(['שלום'], 'he')).toEqual(['שלומ']);
  });

  it('Given Spanish words with accents, Then targets are accent-free like the tiles', () => {
    expect(lessonTargets(['camión'], 'es')).toEqual(['CAMION']);
  });

  it('Given a word with letters no tile carries, Then it is dropped (never an impossible target)', () => {
    expect(lessonTargets(['漢字', 'ねこ'], 'ja')).toEqual(['ねこ']);
  });
});

describe('lessonDraw', () => {
  it('Given a target, Then the draw pulls its missing letters from anywhere in the bag first', () => {
    const bag = tiles('XXXXXXXXCAT');
    const { drawn, rest } = lessonDraw(bag, 7, [], 'CAT');
    expect(drawn.map((t) => t.letter).sort()).toEqual(['A', 'C', 'T', 'X', 'X', 'X', 'X'].sort());
    expect(drawn).toHaveLength(7);
    expect(rest).toHaveLength(4);
  });

  it('Given the rack already holds some target letters, Then only the missing ones are pulled', () => {
    const bag = tiles('XXXXCAT');
    const { drawn } = lessonDraw(bag, 2, tiles('CA'), 'CAT');
    expect(drawn.map((t) => t.letter)).toEqual(['T', 'X']);
  });

  it('Given no target, Then it is a plain front-of-bag draw', () => {
    const bag = tiles('ABCDEF');
    expect(lessonDraw(bag, 3, [], null).drawn.map((t) => t.letter)).toEqual(['A', 'B', 'C']);
  });

  it('does not mutate the bag array', () => {
    const bag = tiles('XXCAT');
    lessonDraw(bag, 3, [], 'CAT');
    expect(bag.map((t) => t.letter).join('')).toBe('XXCAT');
  });
});

describe('foundLessonWords', () => {
  it('Given played words, Then only lesson targets are returned, matched through the same canonical form', () => {
    expect(foundLessonWords(['CAT', 'AX'], ['CAT', 'DOG'], 'en')).toEqual(['CAT']);
  });

  it('Given a Hebrew word played with regular tiles, Then it matches its final-form lesson word', () => {
    const targets = lessonTargets(['שלום'], 'he');
    expect(foundLessonWords(['שלומ'], targets, 'he')).toEqual(targets);
  });
});

describe('nextLessonTarget', () => {
  it('Given some found, Then the first unfound target is next; all found → null', () => {
    expect(nextLessonTarget(['CAT', 'DOG'], ['CAT'])).toBe('DOG');
    expect(nextLessonTarget(['CAT'], ['CAT'])).toBeNull();
  });
});
