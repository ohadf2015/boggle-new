import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261011121000_schedule_assignment_due_reminders.sql'),
  'utf8',
);

describe('assignment-due-reminders pg_cron migration', () => {
  it('schedules a daily 09:50 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'assignment-due-reminders'/);
    expect(sql).toContain("'50 9 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('/api/cron/assignment-due-reminders');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });
});
