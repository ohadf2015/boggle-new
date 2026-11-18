import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261119235000_schedule_google_signup_drought.sql'),
  'utf8',
);

describe('google-signup-drought migration', () => {
  it('schedules an afternoon UTC job against the live handler with the vault cron secret', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'google-signup-drought',\s*'0 14-21 \* \* \*'/);
    expect(sql).toContain('/api/cron/google-signup-drought');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });

  it('adds no database function', () => {
    expect(sql).not.toMatch(/CREATE (OR REPLACE )?FUNCTION/i);
  });
});
