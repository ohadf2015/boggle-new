/**
 * Server-side backstop for single-word teacher lists
 * (supabase/migrations/20261021100000_reject_multi_word_lesson_terms.sql).
 * The pattern was checked read-only against prod Postgres: "Rely on",
 * "Blood transfusion", "well-being", "בית ספר" match; "cat", "don't",
 * "ג'ירפה", "café", "pre-" do not.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261021100000_reject_multi_word_lesson_terms.sql'), 'utf8');
const ts = fs.readFileSync(path.join(root, 'lib/education/singleWordTerm.ts'), 'utf8');

describe('reject multi-word lesson terms migration', () => {
  it('only checks direct client writes', () => {
    expect(sql).toMatch(/current_user not in \('authenticated', 'anon'\)/);
  });

  it('guards inserts and word edits on vocabulary_lessons', () => {
    expect(sql).toMatch(/before insert or update of words on public\.vocabulary_lessons/);
  });

  it('grandfathers terms already in the row instead of mutating existing lists', () => {
    expect(sql).toMatch(/from jsonb_array_elements\(old\.words\) o/);
    expect(sql).not.toMatch(/new\.words\s*:=/);
    expect(sql).not.toMatch(/\bupdate\s+public\.vocabulary_lessons\b/i);
  });

  it('uses the same separators as the client guard', () => {
    const pg = sql.match(/sep constant text := '([^']+)'/)![1].replace('[:space:]', '');
    const js = ts.match(/const SEP = '([^']+)'/)![1].replace('\\\\s', '').replace('\\\\-', '-');
    expect([...pg].sort()).toEqual([...js].sort());
  });

  it('fails with a check_violation the client can recognise', () => {
    expect(sql).toMatch(/errcode = '23514'/);
    expect(sql).toMatch(/message = 'lesson_terms_not_single_words'/);
    expect(ts).toMatch(/INVALID_TERMS_ERROR = 'lesson_terms_not_single_words'/);
  });
});
