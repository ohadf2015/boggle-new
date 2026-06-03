import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Validates the Hebrew language-arts curriculum seed migration.
 * Guards seed integrity (real Hebrew words + definitions, valid enums) AND
 * the honesty rule: no `MOE-` standard codes (we have no Ministry sign-off).
 */
// Resolve relative to THIS file (not process.cwd()) so the test passes whether
// vitest runs from fe-next or the repo root.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION = path.resolve(
  HERE,
  '../../../../supabase/migrations/20260603160000_curriculum_hebrew_lists.sql',
);

const GRADE_LEVELS = ['grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6'];
const hasHebrew = (s: string) => /[֐-׿]/.test(s);

function loadSql(): string {
  return fs.readFileSync(MIGRATION, 'utf8');
}

function extractWordArrays(sql: string): { word: string; definition: string; canIntegrate: boolean }[][] {
  return [...sql.matchAll(/'(\[[\s\S]*?\])'::jsonb/g)].map((m) => JSON.parse(m[1]));
}

describe('Hebrew curriculum seed migration', () => {
  it('exists', () => {
    expect(fs.existsSync(MIGRATION)).toBe(true);
  });

  it('seeds at least 6 Hebrew language-arts lists (grades 1-6)', () => {
    const sql = loadSql();
    const lists = extractWordArrays(sql);
    expect(lists.length).toBeGreaterThanOrEqual(6);
    // every list tagged Hebrew language + Hebrew subject
    expect((sql.match(/'hebrew'/g) || []).length).toBeGreaterThanOrEqual(6);
    expect((sql.match(/'he'/g) || []).length).toBeGreaterThanOrEqual(6);
    GRADE_LEVELS.forEach((g) => expect(sql).toContain(`'${g}'`));
  });

  it('every list has >=12 words, each a real Hebrew word with a Hebrew definition', () => {
    const lists = extractWordArrays(loadSql());
    let total = 0;
    for (const list of lists) {
      expect(list.length).toBeGreaterThanOrEqual(12);
      const seen = new Set<string>();
      for (const w of list) {
        expect(w.word.trim().length).toBeGreaterThan(0);
        expect(hasHebrew(w.word)).toBe(true);
        expect(w.definition.trim().length).toBeGreaterThan(0);
        expect(hasHebrew(w.definition)).toBe(true);
        expect(w.canIntegrate).toBe(true);
        expect(seen.has(w.word)).toBe(false); // no dup within a list
        seen.add(w.word);
        total += 1;
      }
    }
    expect(total).toBeGreaterThanOrEqual(80); // meaningful expansion beyond the 4 thin seeds
  });

  it('does NOT imply Ministry-of-Education endorsement (no MOE- codes)', () => {
    const sql = loadSql();
    expect(/MOE-/.test(sql)).toBe(false);
    expect((sql.match(/'HE-G[1-6]'/g) || []).length).toBeGreaterThanOrEqual(6);
  });

  it('never inserts the generated word_count column', () => {
    const sql = loadSql();
    expect(/insert\s+into\s+curriculum_word_lists\s*\([^)]*word_count/i.test(sql)).toBe(false);
  });
});
