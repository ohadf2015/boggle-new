import { describe, expect, it } from 'vitest';
import { getCatalog } from '@/lib/seo/wordLists/catalog';
import { playableWord } from '@/lib/seo/wordLists/model';
import {
  buildPuzzle,
  gradeAnswer,
  graphemes,
  hasTiles,
  isFull,
  nextOpenSlot,
  placeTile,
  removeAt,
  removeLast,
  speechLang,
  tileForKey,
  wordGroups,
} from '../_components/spellPuzzle';

const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('spellPuzzle', () => {
  it('Given a word with a combining mark, When split, Then each grapheme stays whole', () => {
    expect(graphemes('café')).toEqual(['c', 'a', 'f', 'é']);
    expect(graphemes('きゅうしょく')).toHaveLength(6);
  });

  it('Given a phrase, When built, Then spaces, hyphens and apostrophes are fixed slots and never tiles', () => {
    const p = buildPuzzle("ice-cream don't", seq(0.5));
    const fixed = p.slots.filter((s) => s.fixed).map((s) => s.char);
    expect(fixed).toEqual(['-', ' ', "'"]);
    expect(p.tiles.map((t) => t.char).sort()).toEqual([...'icecreamdont'].sort());
  });

  it('Given a word, When built, Then the tiles are never laid out in spelling order', () => {
    for (let i = 0; i < 20; i++) {
      const p = buildPuzzle('brave', () => 0.99);
      expect(p.tiles.map((t) => t.char).join('')).not.toBe('brave');
    }
  });

  it('Given a filled wrong answer, When graded, Then each slot is marked right or wrong by its logical position', () => {
    const p = buildPuzzle('cat', seq(0.1, 0.7, 0.3));
    const byChar = (c: string) => p.tiles.find((t) => t.char === c)!.id;
    const answer = [byChar('a'), byChar('c'), byChar('t')];
    expect(gradeAnswer(p, answer)).toEqual([false, false, true]);
    const right = [byChar('c'), byChar('a'), byChar('t')];
    expect(gradeAnswer(p, right)).toEqual([true, true, true]);
  });

  it('Given repeated letters, When graded, Then either copy of the letter counts as right', () => {
    const p = buildPuzzle('noon', seq(0.2, 0.8, 0.4));
    const ns = p.tiles.filter((t) => t.char === 'n').map((t) => t.id);
    const os = p.tiles.filter((t) => t.char === 'o').map((t) => t.id);
    expect(gradeAnswer(p, [ns[1], os[0], os[1], ns[0]])).toEqual([true, true, true, true]);
  });

  it('Given tiles placed, When the next open slot is asked, Then fixed slots are skipped', () => {
    const p = buildPuzzle('a-b', seq(0.5));
    let answer = p.slots.map(() => null as number | null);
    expect(nextOpenSlot(p, answer)).toBe(0);
    answer = placeTile(p, answer, p.tiles[0].id);
    expect(nextOpenSlot(p, answer)).toBe(2);
    answer = placeTile(p, answer, p.tiles[1].id);
    expect(isFull(p, answer)).toBe(true);
    expect(removeLast(p, answer)[2]).toBeNull();
    expect(removeAt(p, answer, 0)[0]).toBeNull();
  });

  it('Given a key press, When matched, Then the first unused tile of that letter is picked, ignoring case', () => {
    const p = buildPuzzle('Anna', seq(0.3));
    const answer = p.slots.map(() => null as number | null);
    const first = tileForKey(p, answer, 'a');
    expect(first).not.toBeNull();
    const after = placeTile(p, answer, first!);
    const second = tileForKey(p, after, 'A');
    expect(second).not.toBe(first);
    expect(tileForKey(p, after, 'z')).toBeNull();
  });

  it('Given a phrase, When grouped, Then slots split into words at spaces so a long phrase wraps by word', () => {
    const p = buildPuzzle('big red bus', seq(0.5));
    expect(wordGroups(p).map((g) => g.length)).toEqual([3, 3, 3]);
  });

  it('maps each list language to a speech voice', () => {
    expect(speechLang('en')).toBe('en-US');
    expect(speechLang('he')).toBe('he-IL');
    expect(speechLang('es')).toBe('es-ES');
    expect(speechLang('sv')).toBe('sv-SE');
    expect(speechLang('ja')).toBe('ja-JP');
  });
});

describe('spellable words', () => {
  it('Given words with and without letters, When checked, Then only words with a tile to place count', () => {
    expect(hasTiles('cat')).toBe(true);
    expect(hasTiles("o'clock")).toBe(true);
    expect(hasTiles('-')).toBe(false);
    expect(hasTiles(' ')).toBe(false);
    expect(hasTiles('')).toBe(false);
  });

  it('Given the catalog, When spell tiles builds its rounds, Then every list has spellable words and Japanese lists are kana-only', () => {
    for (const list of getCatalog().lists) {
      expect(list.words.some((w) => hasTiles(playableWord(w.word))), list.id).toBe(true);
      if (list.lang === 'ja') for (const w of list.words) expect(/\p{Script=Han}/u.test(w.word), `${list.id}:${w.word}`).toBe(false);
    }
  });
});
