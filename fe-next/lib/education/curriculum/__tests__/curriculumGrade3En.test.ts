import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import { withBlank } from '@/lib/education/vocabFocus';
import { buildCurriculumMigration, loadCurriculumSeed, migrationPath, type CurriculumSeedFile } from '../curriculumSeed';
import { dictionaryKey, hasShippedDictionary, loadShippedDictionary } from '../curriculumDictCheck';

const K1_WORDS = ['apple', 'book', 'cat', 'dog', 'house', 'jump', 'eat', 'good', 'happy', 'play', 'food', 'water'];

let seed: CurriculumSeedFile;
const hasDict = hasShippedDictionary('en');
let dict: Set<string>;

beforeAll(() => {
  seed = loadCurriculumSeed('en-grade3');
  if (hasDict) dict = loadShippedDictionary('en');
}, 60_000);

describe('en grade-3 tier', () => {
  it('ships as its own migration, leaving the v2 en migration untouched', () => {
    expect(seed.migration).toBe('20261003100000_curriculum_v2_en_grade3.sql');
    expect(fs.readFileSync(migrationPath(seed), 'utf8')).toBe(buildCurriculumMigration(seed));
    expect(seed.lists.flatMap((l) => l.replaces ?? [])).toEqual([]);
  });

  it('has at least two English grade-3 lists of 15+ words', () => {
    expect(seed.lists.length).toBeGreaterThanOrEqual(2);
    for (const list of seed.lists) {
      expect(list.language, list.code).toBe('en');
      expect(list.grade, list.code).toBe('grade_3');
      expect(list.words.length, list.code).toBeGreaterThanOrEqual(15);
    }
  });

  it.skipIf(!hasDict)('plays every word from the shipped en dictionary as one lowercase token (needs public/dicts/en.dict.gz, a build artifact)', () => {
    for (const list of seed.lists) {
      for (const w of list.words) {
        expect(w.word, w.word).toMatch(/^[a-z]+$/);
        expect(dict.has(dictionaryKey(w.word, 'en')), w.word).toBe(true);
      }
    }
  });

  it('gives every word a short non-circular definition and an example that uses it', () => {
    for (const list of seed.lists) {
      for (const w of list.words) {
        expect(w.definition.trim().split(/\s+/).length, w.word).toBeLessThanOrEqual(12);
        expect(withBlank(w.definition, w.word), `${w.word} defines itself`).toBeNull();
        expect(withBlank(w.example, w.word), w.word).not.toBeNull();
      }
    }
  });

  it('is a real step up: no K-1 words and nothing already in another en list', () => {
    const existing = new Set(
      loadCurriculumSeed('en')
        .lists.filter((l) => l.language === 'en')
        .flatMap((l) => l.words.map((w) => w.word)),
    );
    const words = seed.lists.flatMap((l) => l.words.map((w) => w.word));
    expect(words.filter((w) => K1_WORDS.includes(w) || existing.has(w))).toEqual([]);
    expect(new Set(words).size).toBe(words.length);
  });
});
