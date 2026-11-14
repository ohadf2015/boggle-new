import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const sql = readFileSync(join(__dirname, '../../supabase/migrations/20261114121000_admin_daily_summary.sql'), 'utf8');

describe('admin-daily-summary migration', () => {
  it('schedules a daily 05:00 UTC job that posts to the live handler with the vault cron secret', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'admin-daily-summary',\s*'0 5 \* \* \*'/);
    expect(sql).toContain('/api/cron/admin-daily-summary');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });

  it('keeps the counting function off the public RPC surface', () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.admin_daily_summary\(date\) FROM PUBLIC, anon, authenticated/);
  });
});
