import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The trial-expiry reminder handler is live; this asserts the pg_cron
 * migration that actually invokes it is in the tree (prod already has
 * jobid 29 — this keeps git from drifting off runtime again).
 */
const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20260911120000_schedule_teacher_trial_reminders.sql'),
  'utf8',
);

describe('teacher-trial-reminders pg_cron migration', () => {
  it('schedules a daily 09:40 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-trial-reminders'/);
    expect(sql).toContain("'40 9 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-trial-reminders');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });

  it('does not add a second jobname that would double-email teachers', () => {
    expect(sql).not.toMatch(/cron\.schedule\(\s*'trial-expiry'/);
  });
});
