import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const report = readFileSync(path.join(__dirname, '../../../supabase/reports/teacher_funnel_steps_30d.sql'), 'utf8');

describe('teacher funnel 30-day readout', () => {
  it('is read-only and lists every step over the last 30 days', () => {
    expect(report).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i);
    expect(report).toContain("interval '30 days'");
    for (const step of [
      'teacher_approved',
      'onboarding_completed',
      'classroom_created',
      'first_assignment_created',
      'students_joined',
      'trial_started',
    ]) {
      expect(report).toContain(step);
    }
    expect(report).toContain('is_rehearsal');
    expect(report).toContain('is_test_account');
    expect(report).not.toContain('p.email');
  });
});
