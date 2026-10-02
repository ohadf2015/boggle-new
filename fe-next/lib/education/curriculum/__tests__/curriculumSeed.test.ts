import { describe, it, expect } from 'vitest';
import fs from 'fs';
import {
  CURRICULUM_LOCALES,
  buildCurriculumMigration,
  curriculumListId,
  loadCurriculumSeed,
  migrationPath,
  type CurriculumSeedFile,
} from '../curriculumSeed';

const sample: CurriculumSeedFile = {
  language: 'en',
  migration: '20990101000000_curriculum_v2_en.sql',
  lists: [
    {
      code: 'LC-EN-G3-TEST',
      replaces: ['MOE-ENG-G3-CORE'],
      name: "Kids' words",
      description: 'Words a teacher can trust.',
      language: 'en',
      grade: 'grade_3',
      subject: 'english',
      words: [{ word: 'cat', definition: 'A small pet that purrs', example: "My cat isn't scared of rain.", level: 'support' }],
    },
  ],
};

describe('curriculumListId', () => {
  it('is a stable RFC-4122 v5 uuid per code', () => {
    const id = curriculumListId('LC-EN-G3-TEST');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(curriculumListId('LC-EN-G3-TEST')).toBe(id);
    expect(curriculumListId('LC-EN-G3-OTHER')).not.toBe(id);
  });
});

describe('buildCurriculumMigration', () => {
  const sql = buildCurriculumMigration(sample);

  it('deactivates the lists it replaces instead of deleting them', () => {
    expect(sql).toContain("UPDATE curriculum_word_lists SET is_active = FALSE WHERE curriculum_standard IN ('MOE-ENG-G3-CORE');");
    expect(/delete\s+from/i.test(sql)).toBe(false);
  });

  it('upserts on a fixed id so re-running refreshes instead of duplicating', () => {
    expect(sql).toContain(`'${curriculumListId('LC-EN-G3-TEST')}'`);
    expect(sql).toMatch(/ON CONFLICT \(id\) DO UPDATE SET/);
  });

  it('dollar-quotes text so apostrophes cannot break the statement', () => {
    expect(sql).toContain("$t$Kids' words$t$");
    expect(sql).toContain(`"example":"My cat isn't scared of rain."`);
    expect(sql).toMatch(/\$j\$\[[\s\S]*\]\$j\$::jsonb/);
  });

  it('writes canIntegrate and never the generated word_count column', () => {
    expect(sql).toContain('"canIntegrate":true');
    expect(/word_count/i.test(sql)).toBe(false);
  });

  it('round-trips the words JSON exactly', () => {
    const json = sql.match(/\$j\$(\[[\s\S]*?\])\$j\$/)![1];
    expect(JSON.parse(json)).toEqual([{ ...sample.lists[0].words[0], canIntegrate: true }]);
  });
});

describe('committed migrations', () => {
  it.each(CURRICULUM_LOCALES)('%s migration matches its seed data (regenerate with scripts/curriculum/build-curriculum-migrations.ts)', (lang) => {
    const seed = loadCurriculumSeed(lang);
    expect(fs.readFileSync(migrationPath(seed), 'utf8')).toBe(buildCurriculumMigration(seed));
  });

  it.each(CURRICULUM_LOCALES)('%s migration stays under the 500-line file cap', (lang) => {
    const seed = loadCurriculumSeed(lang);
    expect(fs.readFileSync(migrationPath(seed), 'utf8').split('\n').length).toBeLessThanOrEqual(500);
  });
});
