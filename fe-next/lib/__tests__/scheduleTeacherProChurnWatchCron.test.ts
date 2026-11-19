import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20260923120000_schedule_teacher_pro_churn_watch.sql'),
  'utf8',
);

describe('teacher-pro-churn-watch pg_cron migration', () => {
  it('schedules a daily 09:50 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-pro-churn-watch'/);
    expect(sql).toContain("'50 9 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 60s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-pro-churn-watch');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 60000');
  });

  it('does not declare the job in vercel.json — Railway does not run Vercel crons', () => {
    // cd0555c0c removed fe-next/vercel.json because production is Railway.
    // A Vercel cron entry would be declared and never applied.
    const vercelJson = join(__dirname, '../../vercel.json');
    expect(existsSync(vercelJson)).toBe(false);
  });
});
