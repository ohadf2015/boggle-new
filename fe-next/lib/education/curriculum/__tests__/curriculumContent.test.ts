import { describe, it, expect, beforeAll } from 'vitest';
import { withBlank } from '@/lib/education/vocabFocus';
import { isVocabularyLevel } from '@/lib/education/differentiation';
import { gradeLevelToBand, GRADE_BANDS, wordIssue } from '@/lib/education/library';
import { moderateForPublish } from '@/lib/education/libraryServer';
import { CURRICULUM_LOCALES, loadCurriculumSeed, type CurriculumSeedFile, type CurriculumLocale } from '../curriculumSeed';
import { dictionaryKey, loadShippedDictionary } from '../curriculumDictCheck';

const GRADES = ['grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'];
const SUBJECTS = ['english', 'hebrew', 'science', 'math', 'history', 'geography', 'general'];

const seeds = new Map<CurriculumLocale, CurriculumSeedFile>();
const dicts = new Map<string, Set<string>>();

beforeAll(() => {
  for (const lang of CURRICULUM_LOCALES) {
    const seed = loadCurriculumSeed(lang);
    seeds.set(lang, seed);
    for (const list of seed.lists) if (!dicts.has(list.language)) dicts.set(list.language, loadShippedDictionary(list.language));
  }
}, 60_000);

describe.each(CURRICULUM_LOCALES)('%s curriculum seed', (lang) => {
  const seed = () => seeds.get(lang)!;
  const ownLists = () => seed().lists.filter((l) => l.language === lang);

  it('has at least 8 lists in its own language', () => {
    expect(ownLists().length).toBeGreaterThanOrEqual(8);
  });

  it('every list is 15-25 distinct words with valid enums and honest codes', () => {
    for (const list of seed().lists) {
      expect(list.words.length, list.code).toBeGreaterThanOrEqual(15);
      expect(list.words.length, list.code).toBeLessThanOrEqual(25);
      expect(new Set(list.words.map((w) => dictionaryKey(w.word, list.language))).size, list.code).toBe(list.words.length);
      expect(GRADES).toContain(list.grade);
      expect(SUBJECTS).toContain(list.subject);
      expect(list.name.length).toBeLessThanOrEqual(100);
      expect(list.description.length).toBeLessThanOrEqual(500);
      expect(list.code).toMatch(/^LC-[A-Z]{2}-/);
      expect(list.code).not.toMatch(/^(MOE-|HE-G)/);
    }
  });

  it('every word is in the shipped dictionary the game plays from', () => {
    const missing: string[] = [];
    for (const list of seed().lists) {
      const dict = dicts.get(list.language)!;
      for (const w of list.words) if (!dict.has(dictionaryKey(w.word, list.language))) missing.push(`${list.code}:${w.word}`);
    }
    expect(missing).toEqual([]);
  });

  it('every word fits on a board: one token, 3-12 letters, right script, not blocked', () => {
    for (const list of seed().lists) {
      for (const w of list.words) {
        const key = dictionaryKey(w.word, list.language);
        expect(key.length, w.word).toBeGreaterThanOrEqual(3);
        expect(key.length, w.word).toBeLessThanOrEqual(12);
        expect(w.word, w.word).not.toMatch(/[\s\-–—]/);
        expect(wordIssue(w.word, list.language), w.word).toBeNull();
      }
    }
  });

  it('every word has a non-circular definition, a usable example and a tier', () => {
    for (const list of seed().lists) {
      for (const w of list.words) {
        expect(w.definition.trim().length, w.word).toBeGreaterThan(0);
        expect(w.definition.length, w.word).toBeLessThanOrEqual(120);
        expect(withBlank(w.definition, w.word), `${w.word} defines itself`).toBeNull();
        expect(w.example.length, w.word).toBeLessThanOrEqual(160);
        expect(withBlank(w.example, w.word), `${w.word}: example must contain the exact word`).not.toBeNull();
        expect(w.example.includes('___'), w.word).toBe(false);
        expect(isVocabularyLevel(w.level), w.word).toBe(true);
      }
    }
  });

  it('every list leaves core students a full set and gives challenge students a stretch', () => {
    for (const list of seed().lists) {
      const tiers = (t: string) => list.words.filter((w) => w.level === t).length;
      expect(tiers('support'), list.code).toBeGreaterThanOrEqual(3);
      expect(tiers('challenge'), list.code).toBeGreaterThanOrEqual(3);
      expect(list.words.length - tiers('challenge'), list.code).toBeGreaterThanOrEqual(10);
    }
  });
});

describe.each(CURRICULUM_LOCALES)('%s curriculum seed — teacher trust', (lang) => {
  const ownLists = () => seeds.get(lang)!.lists.filter((l) => l.language === lang);

  it('covers every grade band (K-2, 3-5, 6-8, 9-12) in its own language', () => {
    const bands = new Set(ownLists().map((l) => gradeLevelToBand(l.grade)));
    expect([...GRADE_BANDS].filter((b) => !bands.has(b))).toEqual([]);
  });

  it('passes the same moderation a teacher hits when publishing a copy', () => {
    for (const list of seeds.get(lang)!.lists) {
      expect(moderateForPublish({ name: list.name, description: list.description, words: list.words }), list.code).toEqual([]);
      const asExamples = list.words.map((w) => ({ word: w.word, definition: w.example }));
      expect(moderateForPublish({ name: list.name, description: list.description, words: asExamples }), `${list.code} examples`).toEqual([]);
    }
  });

  it('gives every word its own example sentence', () => {
    for (const list of seeds.get(lang)!.lists) {
      const examples = list.words.map((w) => w.example);
      expect(new Set(examples).size, list.code).toBe(examples.length);
    }
  });
});

describe('ja curriculum seed script', () => {
  it('spells every word in hiragana, the only script on ja boards', () => {
    for (const list of loadCurriculumSeed('ja').lists) {
      for (const w of list.words) expect(w.word, w.word).toMatch(/^[\u3041-\u3096ー]+$/u);
    }
  });
});

describe('curriculum seed codes', () => {
  it('are unique across every locale', () => {
    const codes = CURRICULUM_LOCALES.flatMap((l) => loadCurriculumSeed(l).lists.map((x) => x.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
});
