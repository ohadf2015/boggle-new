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

  it('reads onboarding and trial_started under the keys the writers persist', () => {
    // PostHog-only NULL slot: a beacon that fired was invisible to this readout.
    expect(report).not.toContain('NULL::bigint');
    expect(report).toContain("event_type = 'teacher_funnel_step'");
    expect(report).toContain("payload->>'step' = 'onboarding_completed'");
    expect(report).toContain('min(se.created_at)');
    expect(report).toContain("p.user_role = 'teacher'");
    // Canonical Polar trial key, not only the legacy subscription.active envelope.
    expect(report).toContain("'teacher_trial_started'");
    expect(report).toContain('trial_canceled');
    expect(report).toContain('trial_expired');
    expect(report).toContain("s.status = 'trialing'");
  });
});
