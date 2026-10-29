import { describe, it, expect } from 'vitest';
import starter from '@/lib/education/curriculum/data/ru-starter.json';
import themes from '@/lib/education/curriculum/data/ru-themes.json';
import {
  buildLessonSeed,
  canonLessonWord,
  isLessonSeedReady,
  matchLessonTarget,
} from '../lessonSeed';
import { isBuildable } from '../wordTowerManager';
import { WORD_TOWER_WHEEL_SIZE } from '@/shared/constants/wordTowerConstants';
import { normalizeRussianWord } from '@/shared/utils/wordNormalization';

type CurriculumFile = { lists: { code: string; words: { word: string }[] }[] };
const wordsOf = (file: CurriculumFile, code: string) =>
  file.lists.find((l) => l.code === code)!.words.map((w) => w.word);

const FIRST_WORDS = wordsOf(starter as CurriculumFile, 'LC-RU-G2-FIRST');
const CYRILLIC = /^[А-Я]$/;

describe('Word Tower lesson seed — Russian curriculum', () => {
  it('Given a real Russian starter list, Then the seed is ready and every tile is a Cyrillic capital', () => {
    expect(isLessonSeedReady(FIRST_WORDS, 'ru')).toBe(true);
    const seed = buildLessonSeed(FIRST_WORDS, 'ru', { seed: 'ru-test' });
    expect(seed.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
    for (const tile of seed.tray) expect(tile).toMatch(CYRILLIC);
    expect(seed.tray).not.toContain('Ё');
    for (const target of seed.targets) expect(isBuildable(target, seed.tray, 'ru')).toBe(true);
  });

  it('Given a lesson word with ё, Then its key is the ё→е form the dictionary stores (uppercased)', () => {
    const withYo = (themes as CurriculumFile).lists.flatMap((l) => l.words.map((w) => w.word)).filter((w) => w.includes('ё'));
    expect(withYo.length).toBeGreaterThan(0);
    for (const word of withYo) {
      expect(canonLessonWord(word, 'ru')).toBe(normalizeRussianWord(word).toUpperCase());
      expect(canonLessonWord(word, 'ru')).not.toContain('Ё');
    }
  });

  it('Given a target typed with ё or е, Then both count as the same lesson hit', () => {
    const seed = buildLessonSeed(['ёжик', 'кошка', 'школа', 'книга'], 'ru', { seed: 'yo' });
    expect(seed.targets).toContain('ЕЖИК');
    expect(matchLessonTarget('ЁЖИК', seed, 'ru')).toBe('ЕЖИК');
    expect(matchLessonTarget('ежик', seed, 'ru')).toBe('ЕЖИК');
  });
});
