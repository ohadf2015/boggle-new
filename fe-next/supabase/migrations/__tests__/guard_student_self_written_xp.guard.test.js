/**
 * Students may write their own progress/achievement rows (RLS update-own), but
 * never the earned columns. Verified live: a student UPDATE of total_xp is a
 * no-op while words_mastered still saves and the owner-run XP RPC still awards.
 */
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../20261016200000_guard_student_self_written_xp.sql'), 'utf8');

describe('guard student self-written XP', () => {
  it('only constrains direct student writes', () => {
    expect(sql.match(/current_user not in \('authenticated', 'anon'\)/g)).toHaveLength(2);
  });

  it.each(['total_xp', 'current_level', 'current_streak', 'longest_streak', 'total_practice_sessions'])(
    'keeps progress.%s from student writes',
    (col) => expect(sql).toMatch(new RegExp(`new\\.${col} := old\\.${col}`))
  );

  it.each(['current_tier', 'progress_value', 'unlocked_at'])('keeps achievements.%s from student writes', (col) => {
    expect(sql).toMatch(new RegExp(`new\\.${col} := old\\.${col}`));
  });

  it('leaves word progress and pins writable', () => {
    expect(sql).not.toMatch(/new\.(words_attempted|words_mastered|is_pinned|completed_at) :=/);
  });

  it('guards inserts too, so a fresh row cannot start with XP', () => {
    expect(sql).toMatch(/before insert or update on public\.student_lesson_progress/);
  });
});
