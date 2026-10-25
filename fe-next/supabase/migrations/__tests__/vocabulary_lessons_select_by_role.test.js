/**
 * Guards the fix for JAVASCRIPT-NEXTJS-2HA / 2HB (2026-10-25): the lessons
 * SELECT policy applied to anon and called has_lesson_access(), which anon
 * cannot EXECUTE, so every anon read failed with 42501.
 */
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../20261025600000_vocabulary_lessons_select_by_role.sql');

describe('vocabulary_lessons select policies split by role', () => {
  const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';
  const policy = (name) => {
    const m = sql.match(new RegExp(`create policy ${name}[\\s\\S]*?;`, 'i'));
    return m ? m[0] : '';
  };

  it('drops the role-less merged policy', () => {
    expect(sql).toMatch(/drop policy if exists merged_vocabulary_lessons_select_public on public\.vocabulary_lessons/i);
  });

  it('gives anon public lists only, without calling has_lesson_access', () => {
    const anon = policy('vocabulary_lessons_select_anon');
    expect(anon).toMatch(/for select\s+to anon/i);
    expect(anon).toMatch(/is_public = true/);
    expect(anon).not.toMatch(/has_lesson_access/);
  });

  it('keeps owner and assigned-student access for signed-in users', () => {
    const auth = policy('vocabulary_lessons_select_authenticated');
    expect(auth).toMatch(/for select\s+to authenticated/i);
    expect(auth).toMatch(/auth\.uid\(\)\) = teacher_id/);
    expect(auth).toMatch(/has_lesson_access\(id, \(select auth\.uid\(\)\)\)/);
  });
});
