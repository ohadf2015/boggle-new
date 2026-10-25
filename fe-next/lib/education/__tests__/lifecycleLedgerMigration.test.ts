import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const sql = readFileSync(
  path.join(__dirname, '../../../supabase/migrations/20261025500000_teacher_lifecycle_ledger_and_digest_schedule.sql'),
  'utf8',
);

describe('lifecycle ledger + digest schedule migration', () => {
  it('creates the ledger keyed so one teacher gets one send per kind per period', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.teacher_lifecycle_sends/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, kind, period_key\)/);
  });

  it('enables RLS on both new tables and adds no policy (service role only)', () => {
    expect(sql).toMatch(/ALTER TABLE public\.teacher_lifecycle_sends ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE public\.cron_heartbeats ENABLE ROW LEVEL SECURITY/);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it('seeds the digest heartbeat without overwriting a real one', () => {
    expect(sql).toMatch(/INSERT INTO public\.cron_heartbeats[\s\S]*'teacher-weekly-digest'[\s\S]*ON CONFLICT \(job\) DO NOTHING/);
  });

  it('schedules the weekly digest idempotently with the cron secret', () => {
    expect(sql).toMatch(/cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'teacher-weekly-digest'/);
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-weekly-digest',\s*'0 8 \* \* 1'/);
    expect(sql).toContain('/api/cron/teacher-weekly-digest');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });
});
