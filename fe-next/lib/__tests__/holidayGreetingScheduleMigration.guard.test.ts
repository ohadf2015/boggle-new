import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261127130000_holiday_greeting_schedule.sql'),
  'utf8',
);

describe('holiday_greeting_sent migration', () => {
  it('given the ledger, then one row per player per campaign, removed with the profile', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.holiday_greeting_sent/);
    expect(sql).toMatch(/user_id uuid NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/campaign text NOT NULL/);
    expect(sql).toMatch(/sent_at timestamptz NOT NULL DEFAULT now\(\)/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, campaign\)/);
  });

  it('given RLS, then only the service role can touch it', () => {
    expect(sql).toMatch(/ALTER TABLE public\.holiday_greeting_sent ENABLE ROW LEVEL SECURITY/);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it('given the schedule, then it reschedules idempotently every 15 minutes with the vault secret', () => {
    expect(sql).toMatch(/cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'holiday-greeting'/);
    expect(sql).toMatch(/cron\.schedule\(\s*'holiday-greeting',\s*'\*\/15 \* \* \* \*'/);
    expect(sql).toContain('https://www.lexiclash.live/api/cron/holiday-greeting');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });

  it('never publishes the table to realtime', () => {
    expect(sql).not.toMatch(/ALTER PUBLICATION/i);
  });
});
