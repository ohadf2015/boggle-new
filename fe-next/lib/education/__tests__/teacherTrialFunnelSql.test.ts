import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TEACHER_TRIAL_FUNNEL_STEPS } from '../teacherTrialFunnel';

const report = readFileSync(path.join(__dirname, '../../../supabase/reports/teacher_trial_funnel.sql'), 'utf8');

describe('teacher trial funnel readout', () => {
  it('is read-only and names every canonical funnel step', () => {
    expect(report).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i);
    for (const step of TEACHER_TRIAL_FUNNEL_STEPS) {
      expect(report).toContain(step);
    }
  });

  it('excludes QA traffic and counts legacy pre-instrumentation rows', () => {
    expect(report).toContain('is_test_account');
    expect(report).toContain('lexiclash.test');
    // The two October trial checkouts predate the canonical events; the report
    // must still see them via the raw webhook rows and the notice ledger.
    expect(report).toContain("payload->>'trial'");
    expect(report).toContain('teacher_trial_canceled');
    expect(report).toContain('customer_cancellation_reason');
    expect(report).toContain("s.status = 'trialing'");
    expect(report).toContain("client_kind");
  });

  it('reads the chip event the writer stores, and drops the known rig user prefixes', () => {
    // Writer: POST /api/subscription/cancel-reason stores event_type
    // trial_cancel_reason_selected with payload.reason. The old name
    // teacher_trial_cancel_reason was never written, so a readout on it stays at 0.
    expect(report).toContain('trial_cancel_reason_selected');
    expect(report).toContain("payload->>'reason'");
    expect(report).not.toContain('teacher_trial_cancel_reason');
    expect(report).toContain('14f10c13');
    expect(report).toContain('1f0715b5');
  });
});
