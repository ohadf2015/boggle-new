import { describe, it, expect } from 'vitest';
import { CURRICULUM_SEEDS, loadCurriculumSeed } from '../curriculumSeed';

const BANDS = [1, 2, 3, 4, 5, 6];
const bandOf = (grade: string) => Math.ceil(Number(grade.replace('grade_', '')) / 2);
const listsIn = (lang: string) =>
  CURRICULUM_SEEDS.flatMap((name) => loadCurriculumSeed(name).lists).filter((l) => l.language === lang);

describe.each([
  ['ja', 2],
  ['sv', 2],
  ['ru', 1],
])('%s grade-band coverage', (lang, min) => {
  it(`has at least ${min} list in every grade band 1-2 .. 11-12`, () => {
    const counts = BANDS.map((b) => listsIn(lang).filter((l) => bandOf(l.grade) === b).length);
    expect(counts.map((c, i) => (c >= min ? null : `band ${BANDS[i]}`)).filter(Boolean)).toEqual([]);
  });
});
