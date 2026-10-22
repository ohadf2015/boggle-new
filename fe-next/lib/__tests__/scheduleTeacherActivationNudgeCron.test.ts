import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261023100000_teacher_activation_nudge.sql'),
  'utf8',
);

describe('teacher-activation-nudge migration', () => {
  it('adds the per-row sent ledger', () => {
    expect(sql).toMatch(
      /ALTER TABLE public\.teacher_access_requests\s+ADD COLUMN IF NOT EXISTS activation_nudges_sent TEXT\[\] NOT NULL DEFAULT '\{\}'/,
    );
  });

  it('schedules a daily 09:55 UTC job, replacing any earlier copy', () => {
    expect(sql).toContain("cron.unschedule(jobid) FROM cron.job WHERE jobname = 'teacher-activation-nudge'");
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-activation-nudge'/);
    expect(sql).toContain("'55 9 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 120s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-activation-nudge');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 120000');
  });
});
