import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261118120000_schedule_teacher_pro_dunning.sql'),
  'utf8',
);

describe('teacher-pro-dunning pg_cron migration', () => {
  it('schedules a daily 10:05 UTC job, after the 09:xx teacher mail pile', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-pro-dunning'/);
    expect(sql).toContain("'5 10 * * *'");
  });

  it('posts to the live handler with vault cron_secret and 60s timeout', () => {
    expect(sql).toContain('/api/cron/teacher-pro-dunning');
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
    expect(sql).toContain('timeout_milliseconds := 60000');
    expect(sql).not.toContain('?hook=1');
  });
});
