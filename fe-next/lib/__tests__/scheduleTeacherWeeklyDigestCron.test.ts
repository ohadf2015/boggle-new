import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20260923180000_schedule_teacher_weekly_digest.sql'),
  'utf8',
);

describe('teacher-weekly-digest pg_cron migration', () => {
  it('schedules a Monday 08:00 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-weekly-digest'/);
    expect(sql).toContain("'0 8 * * 1'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-weekly-digest');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });
});
