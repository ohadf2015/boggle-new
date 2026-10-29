import { describe, it, expect } from 'vitest';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';
import { CURRICULUM_SEEDS, loadCurriculumSeed } from '@/lib/education/curriculum/curriculumSeed';
import { gradeLevelToBand } from '@/lib/education/library';
import { ASSIGNMENT_TEMPLATES, SUBJECTS, assignmentTemplatesFor } from '../assignmentTemplates';
import { INTL_ASSIGNMENT_TEMPLATES } from '../assignmentTemplatesIntl';

const listByCode = new Map(CURRICULUM_SEEDS.flatMap((n) => loadCurriculumSeed(n).lists).map((l) => [l.code, l]));
const BAND = { k2: 'k-2', g35: '3-5', g68: '6-8' } as const;

describe('assignment templates beyond English', () => {
  it.each(EDUCATION_LANGUAGES.filter((l) => l !== 'en'))('%s has its own gallery of at least 4 native lists', (language) => {
    const templates = assignmentTemplatesFor(language);
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.every((t) => t.language === language)).toBe(true);
    expect(new Set(templates.map((t) => t.gradeBand)).size).toBeGreaterThanOrEqual(3);
  });

  it('every word is copied from the dictionary-checked curriculum list it cites, in the same language and band', () => {
    for (const t of INTL_ASSIGNMENT_TEMPLATES) {
      const list = listByCode.get(t.source);
      expect(list, t.id).toBeDefined();
      expect(list!.language).toBe(t.language);
      expect(BAND[gradeLevelToBand(list!.grade) as keyof typeof BAND]).toBe(t.gradeBand);
      expect(t.words.length).toBeGreaterThanOrEqual(8);
      for (const w of t.words) {
        expect(list!.words.find((x) => x.word === w.word)?.definition, `${t.id}:${w.word}`).toBe(w.definition);
        expect(w.canIntegrate).toBe(true);
      }
    }
  });

  it('uses only known subjects and keeps every id unique across the whole catalog', () => {
    for (const t of ASSIGNMENT_TEMPLATES) expect(SUBJECTS).toContain(t.subject);
    const ids = ASSIGNMENT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names every template with a shared band+subject key', () => {
    for (const t of INTL_ASSIGNMENT_TEMPLATES) {
      expect(t.nameKey).toMatch(/^teacher\.assignment\.templateIntl\.(k2|g35|g68)(Language|Science|Geography)$/);
      expect(t.descriptionKey).toBe(`${t.nameKey}Desc`);
    }
  });
});
