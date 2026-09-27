/**
 * Guards the wiring of the teacher trial-expiry reminder cron.
 * Send logic is covered by lib/education/__tests__/trialReminders.test.ts —
 * this only asserts the pg_cron entry that invokes it exists and points at
 * the live handler (the gap that left 8 lapsed teachers unasked).
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../20260911120000_schedule_teacher_trial_reminders.sql'
);

describe('teacher trial-expiry reminder cron migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('schedules a daily 09:40 UTC job named teacher-trial-reminders', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'teacher-trial-reminders'/);
    expect(sql).toContain("'40 9 * * *'");
  });

  it('posts to the teacher-trial-reminders endpoint', () => {
    expect(sql).toContain('/api/cron/teacher-trial-reminders');
  });

  it('authenticates with the cron secret header', () => {
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });

  it('sets a pg_net timeout long enough for a multi-teacher send', () => {
    expect(sql).toContain('timeout_milliseconds := 120000');
  });

  it('does not schedule a second jobname that would double-email', () => {
    expect(sql).not.toMatch(/cron\.schedule\(\s*'trial-expiry'/);
  });
});
