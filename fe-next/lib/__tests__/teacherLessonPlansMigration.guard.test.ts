import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  join(__dirname, '../../supabase/migrations/20261112090000_teacher_lesson_plans.sql'),
  'utf8',
);

describe('teacher_lesson_plans migration', () => {
  it('given the table, then it holds one plan per class, owned by the teacher', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.teacher_lesson_plans/);
    expect(sql).toMatch(/teacher_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/classroom_id uuid NOT NULL REFERENCES public\.classrooms\(id\) ON DELETE CASCADE/);
    expect(sql).toMatch(/lesson_at timestamptz NOT NULL/);
    expect(sql).toMatch(/reminded_at timestamptz/);
    expect(sql).toMatch(/UNIQUE \(classroom_id\)/);
  });

  it('given RLS, then each policy is re-runnable and scoped to the caller', () => {
    expect(sql).toMatch(/ALTER TABLE public\.teacher_lesson_plans ENABLE ROW LEVEL SECURITY/);
    for (const op of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      expect(sql).toMatch(new RegExp(`CREATE POLICY [^;]+FOR ${op}`));
    }
    expect((sql.match(/DROP POLICY IF EXISTS/g) ?? []).length).toBe(4);
    expect((sql.match(/\(select auth\.uid\(\)\)/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(sql).toMatch(/FOR UPDATE[\s\S]+USING[\s\S]+WITH CHECK/);
  });

  it('given the cron scan, then unreminded plans are indexed by lesson time', () => {
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS \w+\s+ON public\.teacher_lesson_plans \(lesson_at\)\s+WHERE reminded_at IS NULL/);
  });

  it('given the schedule, then it reschedules idempotently every 15 minutes with the vault secret', () => {
    expect(sql).toMatch(/cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'teacher-lesson-reminder'/);
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-lesson-reminder',\s*'\*\/15 \* \* \* \*'/);
    expect(sql).not.toMatch(/:20/);
    expect(sql).toContain('https://www.lexiclash.live/api/cron/teacher-lesson-reminder');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });

  it('never publishes the table to realtime', () => {
    expect(sql).not.toMatch(/ALTER PUBLICATION/i);
  });
});
