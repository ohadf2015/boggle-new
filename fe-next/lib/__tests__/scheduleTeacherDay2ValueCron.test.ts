import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261028193000_teacher_day2_value_email.sql'),
  'utf8',
);

describe('teacher-day2-value migration', () => {
  it('reschedules idempotently as an hourly job off the abandoned-checkout minute', () => {
    expect(sql).toMatch(/cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'teacher-day2-value'/);
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-day2-value'/);
    expect(sql).toContain("'35 * * * *'");
    expect(sql).not.toContain("'20 * * * *'");
  });

  it('posts to the live handler with vault cron_secret and a 120s timeout', () => {
    expect(sql).toContain('https://www.lexiclash.live/api/cron/teacher-day2-value');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });

  it('does not create a new table; the marker is the existing lifecycle ledger', () => {
    expect(sql).not.toMatch(/CREATE TABLE/i);
    expect(sql).toContain("day2_value");
  });
});
