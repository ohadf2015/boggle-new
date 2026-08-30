/**
 * Guards the wiring of the re-engagement email cron (docs/growth/2026-08-12-monetization-and-retention-plan.md Phase 2).
 * The send logic itself is covered by lib/__tests__/reengagementEmail.test.ts — this only
 * asserts the pg_cron entry that invokes it actually exists and points at the right place.
 */

const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '../20260824120000_schedule_reengagement_email_cron.sql'
);

describe('reengagement email cron migration', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  it('schedules an hourly job', () => {
    expect(sql).toMatch(/cron\.schedule\(\s*'reengagement-email-hourly'/);
    expect(sql).toContain("'0 * * * *'");
  });

  it('posts to the send-reengagement endpoint', () => {
    expect(sql).toContain('/api/email/send-reengagement');
  });

  it('authenticates with the cron secret header', () => {
    expect(sql).toContain('x-cron-secret');
    expect(sql).toContain("vault.decrypted_secrets WHERE name = 'cron_secret'");
  });
});
