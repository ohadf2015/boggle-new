import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261023120000_teacher_abandoned_checkout.sql'),
  'utf8',
);

describe('teacher-abandoned-checkout migration', () => {
  it('indexes subscription_events by event type and time for the hourly window scan', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS \w+\s+ON public\.subscription_events \(event_type, created_at\)/);
  });

  it('reschedules idempotently as an hourly job', () => {
    expect(sql).toMatch(/cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'teacher-abandoned-checkout'/);
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-abandoned-checkout'/);
    expect(sql).toContain("'20 * * * *'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('https://www.lexiclash.live/api/cron/teacher-abandoned-checkout');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });
});
