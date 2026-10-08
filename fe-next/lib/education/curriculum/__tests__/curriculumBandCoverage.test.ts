import { describe, it, expect } from 'vitest';
import { CURRICULUM_SEEDS, loadCurriculumSeed } from '../curriculumSeed';

const BANDS = [1, 2, 3, 4, 5, 6];
const bandOf = (grade: string) => Math.ceil(Number(grade.replace('grade_', '')) / 2);
const listsIn = (lang: string) =>
  CURRICULUM_SEEDS.flatMap((name) => loadCurriculumSeed(name).lists).filter((l) => l.language === lang);

describe.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('%s grade-band coverage', (lang) => {
  it('has at least 2 lists in every grade band 1-2 .. 11-12', () => {
    const counts = BANDS.map((b) => listsIn(lang).filter((l) => bandOf(l.grade) === b).length);
    expect(counts.map((c, i) => (c >= 2 ? null : `band ${BANDS[i]}`)).filter(Boolean)).toEqual([]);
  });
});
