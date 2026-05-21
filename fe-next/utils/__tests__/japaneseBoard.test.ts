/**
 * Frontend Japanese board generation must be HIRAGANA, matching backend grids +
 * the (now hiragana) validation dictionaries. `japaneseLetters` / `kanjiCompounds`
 * are the shared source for ALL frontend JA board generators (single-player,
 * custom challenge, daily challenge, brain drills, adventure), so locking them
 * here covers every consumer. A kanji board against a hiragana dictionary
 * validates nothing. See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
 */
import { describe, it, expect } from 'vitest';
import { generateRandomTable } from '../utils';
import { japaneseLetters, kanjiCompounds } from '../consts';

const HIRAGANA_ONLY = /^[぀-ゟー]+$/;
const KANJI = /[一-龯]/;

describe('frontend Japanese board source (consts)', () => {
  it('japaneseLetters are all hiragana, no kanji', () => {
    expect(japaneseLetters.length).toBeGreaterThan(0);
    for (const ch of japaneseLetters) {
      expect(ch).toMatch(HIRAGANA_ONLY);
      expect(KANJI.test(ch)).toBe(false);
    }
  });

  it('embeddable words (kanjiCompounds export) are all hiragana words', () => {
    expect(kanjiCompounds.length).toBeGreaterThan(0);
    for (const w of kanjiCompounds) {
      expect(w, `embed word "${w}" must be hiragana`).toMatch(HIRAGANA_ONLY);
    }
  });
});

describe('generateRandomTable("ja") produces a hiragana board', () => {
  it('every cell is hiragana, never kanji', () => {
    const grid = generateRandomTable(5, 5, 'ja');
    expect(grid).toHaveLength(5);
    for (const row of grid) {
      for (const cell of row) {
        expect(cell, `cell "${cell}" must be hiragana`).toMatch(HIRAGANA_ONLY);
      }
    }
  });
});
