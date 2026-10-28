import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const report = readFileSync(path.join(root, 'supabase/reports/paid_campaign_funnel.sql'), 'utf8');
const migration = readFileSync(
  path.join(root, 'supabase/migrations/20261028140000_paid_campaign_funnel_and_rehearsal.sql'),
  'utf8',
);

describe('paid campaign readout SQL', () => {
  it('is a read-only report with the funnel columns', () => {
    expect(report).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i);
    for (const col of ['signups', 'teachers', 'access_approved', 'classroom_created', 'first_student', 'first_real_round', 'd1_returned', 'd7_returned']) {
      expect(report).toContain(col);
    }
    expect(report).toContain("lower(trim(p.utm_medium)) = 'paid'");
    expect(report).toContain('is_rehearsal');
    expect(report).toContain('player_count >= 2');
    expect(report).toContain('auth.users');
    expect(report).not.toContain('p.email');
    expect(report).not.toContain('p.is_anonymous');
    expect(migration).not.toContain('p.email');
    expect(migration).not.toContain('p.is_anonymous');
  });

  it('ships a service-role-only function and the rehearsal column, not a realtime publication', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS is_rehearsal');
    expect(migration).toContain('admin_paid_campaign_funnel');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.admin_paid_campaign_funnel(INT) TO service_role');
    expect(migration).not.toMatch(/ALTER PUBLICATION supabase_realtime/i);
    expect(migration).not.toMatch(/\bINSERT INTO\b/i);
  });
});
