import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20260911140000_schedule_school_leads_digest.sql'),
  'utf8',
);

describe('school-leads-digest pg_cron migration', () => {
  it('schedules a Monday 07:00 UTC job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'school-leads-digest'/);
    expect(sql).toContain("'0 7 * * 1'");
  });

  it('posts to the live handler with vault cron_secret', () => {
    expect(sql).toContain('/api/cron/school-leads-digest');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });
});
