import { describe, it, expect } from 'vitest';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { loadCurriculumSeed, type CurriculumSeedName } from '@/lib/education/curriculum/curriculumSeed';
import {
  findThemedPack,
  loadThemedPacks,
  packLessonInput,
  packThemesFor,
  seasonThemeFor,
  themedPackCode,
  toThemedPack,
} from '@/lib/education/themedPacks';

describe.each(EDUCATION_LANGUAGES)('%s themed packs', (language) => {
  const seed = () => loadCurriculumSeed(`${language}-themes` as CurriculumSeedName);

  it('ships exactly the themes the catalog promises, no more and no fewer', () => {
    const codes = seed().lists.map((l) => l.code).sort();
    expect(codes).toEqual(packThemesFor(language).map((t) => themedPackCode(language, t)).sort());
  });

  it('every list is in the board language', () => {
    for (const list of seed().lists) expect(list.language, list.code).toBe(language);
  });

  it('loads in the browser as packs a teacher can add, with every word kept', async () => {
    const packs = await loadThemedPacks(language);
    expect(packs).toHaveLength(packThemesFor(language).length);
    for (const pack of packs) {
      const list = seed().lists.find((l) => l.code === pack.code)!;
      expect(pack.words.map((w) => w.word)).toEqual(list.words.map((w) => w.word));
      expect(pack.words.every((w) => !!w.definition)).toBe(true);
    }
  });
});

describe('toThemedPack', () => {
  const list = {
    code: 'LC-EN-PK-WINTER',
    name: 'Winter',
    description: 'Cold words',
    language: 'en' as const,
    grade: 'grade_3' as const,
    subject: 'general' as const,
    words: [
      { word: 'snow', definition: 'Frozen flakes', example: 'Snow fell all night.', level: 'support' as const },
      { word: 'frost', definition: 'Ice on grass', example: 'The frost was white.', level: 'challenge' as const },
    ],
  };

  it('maps the curriculum tier to the lesson difficulty and never leaks the example (it contains the answer)', () => {
    const pack = toThemedPack(list)!;
    expect(pack.theme).toBe('winter');
    expect(pack.group).toBe('season');
    expect(pack.gradeBand).toBe('g35');
    expect(pack.mascot).toBe('winter');
    expect(toThemedPack({ ...list, code: 'LC-EN-PK-SCHOOL' })!.mascot).toBe('backToSchool');
    expect(toThemedPack({ ...list, code: 'LC-EN-PK-SUMMER' })!.mascot).toBe('endOfYear');
    expect(toThemedPack({ ...list, code: 'LC-EN-PK-MATH' })!.mascot).toBeUndefined();
    expect(pack.words).toEqual([
      { word: 'snow', definition: 'Frozen flakes', difficulty: 'easy' },
      { word: 'frost', definition: 'Ice on grass', difficulty: 'hard' },
    ]);
    expect(packLessonInput(pack)).toEqual({ name: 'Winter', description: 'Cold words', language: 'en', words: pack.words });
  });

  it('ignores a list that is not a themed pack', () => {
    expect(toThemedPack({ ...list, code: 'LC-EN-G3-CORE' })).toBeNull();
  });
});

describe('seasonThemeFor', () => {
  it.each([
    [8, 'school'],
    [9, 'school'],
    [10, 'autumn'],
    [11, 'autumn'],
    [12, 'winter'],
    [1, 'winter'],
    [2, 'winter'],
    [3, 'spring'],
    [5, 'spring'],
    [6, 'summer'],
    [7, 'summer'],
  ])('month %i -> %s', (month, theme) => {
    expect(seasonThemeFor(new Date(2026, month - 1, 15))).toBe(theme);
  });
});

describe('findThemedPack', () => {
  it('finds a pack by its code and rejects junk', async () => {
    expect((await findThemedPack('LC-SV-PK-WINTER'))?.language).toBe('sv');
    expect(await findThemedPack('LC-XX-PK-WINTER')).toBeNull();
    expect(await findThemedPack('nope')).toBeNull();
  });
});
