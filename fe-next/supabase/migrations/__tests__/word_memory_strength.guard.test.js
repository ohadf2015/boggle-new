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

  it('adds constraints only when missing (or after dropping them), so a rerun does not fail', () => {
    expect(code).toMatch(/DROP CONSTRAINT IF EXISTS practice_sessions_practice_type_check;\s*ALTER TABLE public\.practice_sessions\s*ADD CONSTRAINT practice_sessions_practice_type_check/);
    const adds = code.replace(/ADD CONSTRAINT practice_sessions_practice_type_check/, '').match(/ADD CONSTRAINT/g) ?? [];
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
    const fn = code.match(/CREATE OR REPLACE FUNCTION calculate_lesson_mastery[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(fn).not.toMatch(/vocabulary_words_found/);
    expect(code).toMatch(/\* 0\.6\) \+/);
    expect(code).toMatch(/\* 0\.4\)/);
    expect(code).toMatch(/>= 0\.8 THEN\s+RETURN 'mastered'/);
    expect(code).toMatch(/>= 0\.4 THEN\s+RETURN 'practicing'/);
    expect(code).toMatch(/> 0 THEN\s+RETURN 'started'/);
  });

  it('stops students writing words_mastered directly: cleared on their inserts, kept on their updates', () => {
    const fn = code.match(/CREATE OR REPLACE FUNCTION public\.guard_student_lesson_progress_earned\(\)[\s\S]*?\$\$;/)?.[0] ?? '';
    expect(fn).toMatch(/current_user not in \('authenticated', 'anon'\)/);
    expect(fn).toMatch(/new\.words_mastered := '\{\}'/);
    expect(fn).toMatch(/new\.words_mastered := old\.words_mastered/);
    for (const col of ['total_xp', 'current_level', 'current_streak', 'longest_streak', 'total_practice_sessions', 'last_practice_date']) {
      expect(fn).toMatch(new RegExp(`new\\.${col} := old\\.${col}`));
    }
  });

  it('applies mastery changes in ONE statement, callable by the server only', () => {
    expect(code).toMatch(/CREATE OR REPLACE FUNCTION public\.apply_words_mastered\(\s*p_student_id uuid,\s*p_lesson_id uuid,\s*p_add text\[\],\s*p_remove text\[\]\s*\)/i);
    expect(code).toMatch(/ON CONFLICT \(student_id, lesson_id\) DO UPDATE/);
    expect(code).toMatch(/revoke execute on function public\.apply_words_mastered\(uuid, uuid, text\[\], text\[\]\) from public, anon, authenticated;/i);
    expect(code).toMatch(/grant execute on function public\.apply_words_mastered\(uuid, uuid, text\[\], text\[\]\) to service_role;/i);
  });

  it('allows the daily_quest practice type, keeping every existing type', () => {
    const check = code.match(/ADD CONSTRAINT practice_sessions_practice_type_check[\s\S]*?\);/)?.[0] ?? '';
    for (const t of ['flashcard', 'solo_board', 'warmup', 'word_list', 'matching', 'spelling', 'blitz', 'vocab_focus', 'daily_quest']) {
      expect(check).toContain(`'${t}'`);
    }
    expect(check).toMatch(/practice_type IS NULL OR/);
  });

  it('backfills words found before the change into words_mastered, so ship-day coverage never drops', () => {
    const backfill = code.indexOf('unnest(ps.vocabulary_words_found)');
    expect(backfill).toBeGreaterThan(code.indexOf('CREATE OR REPLACE FUNCTION calculate_lesson_mastery'));
    expect(code).toMatch(/INSERT INTO public\.student_lesson_progress AS slp[\s\S]*?ON CONFLICT \(student_id, lesson_id\) DO UPDATE SET words_mastered/);
    expect(code).toMatch(/EXISTS \(SELECT 1 FROM public\.vocabulary_lessons vl WHERE vl\.id = /);
    expect(code).toMatch(/EXISTS \(SELECT 1 FROM auth\.users u WHERE u\.id = /);
  });

  it('backfills strength for review rows written before the engine, only once, after the words_mastered backfill', () => {
    const union = code.indexOf('unnest(ps.vocabulary_words_found)');
    const flower = code.search(/SET strength = 'flower'/);
    const plant = code.search(/SET strength = 'plant'/);
    expect(flower).toBeGreaterThan(union);
    expect(plant).toBeGreaterThan(flower);
    const guards = code.match(/WHERE wrs\.strength = 'sprout'\s+AND wrs\.last_correct_date IS NULL/g) ?? [];
    expect(guards).toHaveLength(2);
    expect(code).toMatch(/AND wrs\.repetitions >= 1/);
  });
});

