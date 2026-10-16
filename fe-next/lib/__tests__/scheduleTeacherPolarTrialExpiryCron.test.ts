import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261015190000_schedule_teacher_polar_trial_expiry.sql'),
  'utf8',
);

describe('teacher-polar-trial-expiry pg_cron migration', () => {
  it('schedules a daily 09:50 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-polar-trial-expiry'/);
    expect(sql).toContain("'50 9 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-polar-trial-expiry');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });

  it('does not reuse the day-10 or access-trial jobname', () => {
    expect(sql).not.toMatch(/cron\.schedule\(\s*'teacher-polar-trial-day10'/);
    expect(sql).not.toMatch(/cron\.schedule\(\s*'teacher-trial-reminders'/);
  });
});
