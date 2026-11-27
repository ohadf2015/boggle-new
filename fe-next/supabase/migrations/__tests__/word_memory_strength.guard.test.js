/**
 * Word memory: strength per student × lesson word on word_review_state. It
 * gates mastery, so only the server may write it. Migrations auto-apply on
 * merge: every statement must be additive and safe to re-run on live rows.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '20261128090000_word_memory_strength.sql');
const sql = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const code = sql.replace(/--.*$/gm, '');

describe('20261128090000_word_memory_strength', () => {
  it('exists', () => expect(sql).not.toBe(''));

  it.each([
    ['correct_days', /ADD COLUMN IF NOT EXISTS correct_days integer NOT NULL DEFAULT 0/],
    ['last_correct_date', /ADD COLUMN IF NOT EXISTS last_correct_date date(,|;|\s)/],
    ['best_gap_days', /ADD COLUMN IF NOT EXISTS best_gap_days integer NOT NULL DEFAULT 0/],
    ['strength', /ADD COLUMN IF NOT EXISTS strength text NOT NULL DEFAULT 'sprout'/],
  ])('adds %s additively, with a default existing rows can take', (_col, re) => expect(code).toMatch(re));

  it('constrains strength to the stored stages (seed = no row)', () => {
    expect(code).toMatch(/CHECK \(strength IN \('sprout', 'plant', 'flower', 'gold'\)\)/);
  });

  it('adds constraints only when missing, so a rerun does not fail', () => {
    const adds = code.match(/ADD CONSTRAINT/g) ?? [];
    const guards = code.match(/IF NOT EXISTS \(SELECT 1 FROM pg_constraint WHERE conname = /g) ?? [];
    expect(adds.length).toBeGreaterThan(0);
    expect(guards.length).toBe(adds.length);
  });

  it('removes student writes (forged strength would forge mastery) and keeps student reads', () => {
    expect(code).toMatch(/DROP POLICY IF EXISTS "Students can insert own review data" ON public\.word_review_state;/);
    expect(code).toMatch(/DROP POLICY IF EXISTS "Students can update own review data" ON public\.word_review_state;/);
    expect(code).not.toMatch(/DROP POLICY IF EXISTS "Students can view own review data"/);
    expect(code).not.toMatch(/CREATE POLICY/);
  });

  it('never publishes the table to realtime, never drops data', () => {
    expect(code).not.toMatch(/supabase_realtime/);
    expect(code).not.toMatch(/DROP (TABLE|COLUMN)|DELETE FROM|TRUNCATE/i);
  });

  it('bases lesson mastery coverage on words_mastered, keeping signature, weights and thresholds', () => {
    expect(code).toMatch(/CREATE OR REPLACE FUNCTION calculate_lesson_mastery\(\s*p_student_id UUID,\s*p_lesson_id UUID\s*\)\s*RETURNS TEXT/);
    expect(code).toMatch(/SECURITY DEFINER/);
    expect(code).toMatch(/SET search_path = public/);
    expect(code).toMatch(/unnest\(slp\.words_mastered\)/);
    expect(code).toMatch(/FROM student_lesson_progress slp/);
    expect(code).not.toMatch(/vocabulary_words_found/);
    expect(code).toMatch(/\* 0\.6\) \+/);
    expect(code).toMatch(/\* 0\.4\)/);
    expect(code).toMatch(/>= 0\.8 THEN\s+RETURN 'mastered'/);
    expect(code).toMatch(/>= 0\.4 THEN\s+RETURN 'practicing'/);
    expect(code).toMatch(/> 0 THEN\s+RETURN 'started'/);
  });
});
