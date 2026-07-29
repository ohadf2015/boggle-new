/**
 * Japanese MP gameplay coherence tests.
 *
 * Japanese is a phonetic-syllabary game: boards are HIRAGANA (not kanji), and
 * the validation dictionary is the pure-hiragana word list. These tests lock the
 * grid↔validation contract so a kana board never ships against a kanji dictionary
 * (which would validate nothing). See
 * docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */
import { describe, it, expect } from 'vitest';
import { generateJapaneseTable, japaneseHiraganaFrequency } from '../gameUtils';
import { loadJapaneseDictionary } from '../../dictionaryLoaders';

// Hiragana block + the long-vowel mark (ー, U+30FC). Excludes katakana and kanji.
const HIRAGANA_ONLY = /^[぀-ゟー]+$/;

describe('generateJapaneseTable (hiragana board)', () => {
  it('fills every cell with a hiragana character — never kanji', () => {
    const grid = generateJapaneseTable(5, 5);
    expect(grid).toHaveLength(5);
    for (const row of grid) {
      expect(row).toHaveLength(5);
      for (const cell of row) {
        expect(cell, `cell "${cell}" must be hiragana`).toMatch(HIRAGANA_ONLY);
      }
    }
  });

  it('can place dakuten / small kana / long-vowel tiles (needed to spell common words)', () => {
    // Sample a large board many times; the expanded pool must be able to surface
    // voiced + small kana, otherwise words like がっこう / きゅうりょう are unspellable.
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const row of generateJapaneseTable(6, 6)) for (const c of row) seen.add(c);
    }
    const expanded = ['が', 'じ', 'だ', 'ぱ', 'っ', 'ゃ', 'ゅ', 'ょ'];
    const present = expanded.filter((k) => seen.has(k));
    expect(present.length, `expanded kana seen: ${present.join('')}`).toBeGreaterThan(0);
  });

  it('weights frequent kana above rare ones', () => {
    expect(japaneseHiraganaFrequency['い']).toBeGreaterThan(japaneseHiraganaFrequency['ぬ']);
    expect(japaneseHiraganaFrequency['ん']).toBeGreaterThan(japaneseHiraganaFrequency['ぱ']);
  });
});

describe('loadJapaneseDictionary (hiragana validation set)', () => {
  // Fake reader keyed by filename suffix so we control each source file's content.
  const fakeRead = (files: Record<string, string>) => async (p: string) => {
    const name = p.split('/').pop() || '';
    return files[name] ?? '';
  };

  it('loads pure-hiragana words and filters kanji + katakana junk', async () => {
    const { words } = await loadJapaneseDictionary(
      fakeRead({
        'japanese_words.txt': 'ねこ\nさくら\nきゅうりょう\n',
        // approved list in the repo is junk-laced: kanji + katakana fragments must be dropped
        'japanese_words_approved.txt': 'ある\nある三里\nあるクロ\n',
        'kanji_compounds.txt': '日本\n学校\n',
      }),
    );
    expect(words.has('ねこ')).toBe(true);
    expect(words.has('きゅうりょう')).toBe(true);
    expect(words.has('ある')).toBe(true); // clean hiragana from approved
    expect(words.has('ある三里')).toBe(false); // contains kanji
    expect(words.has('あるクロ')).toBe(false); // contains katakana
    expect(words.has('日本')).toBe(false); // kanji compound never enters validation set
  });

  it('still returns kanji compounds (for legacy board-seeding consumer)', async () => {
    const { compounds } = await loadJapaneseDictionary(
      fakeRead({ 'japanese_words.txt': 'ねこ\n', 'kanji_compounds.txt': '日本\n学校\n' }),
    );
    expect(compounds).toEqual(['日本', '学校']);
  });
});

describe('grid ↔ validation coherence (integration)', () => {
  it('a hiragana word can be validated the same way isValidWord does (Set.has)', async () => {
    const fakeRead = async (p: string) =>
      (p.endsWith('japanese_words.txt') ? 'ねこ\nさくら\n' : '');
    const { words } = await loadJapaneseDictionary(fakeRead);

    // Board is hiragana; the dictionary is hiragana; Dictionary.isValidWord('ja')
    // checks `words.has(word)` with no transform — so this is the real contract.
    const grid = generateJapaneseTable(4, 4);
    for (const row of grid) for (const cell of row) expect(cell).toMatch(HIRAGANA_ONLY);
    expect(words.has('ねこ')).toBe(true);
  });
});
