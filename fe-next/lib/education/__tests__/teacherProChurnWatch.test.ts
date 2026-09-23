import { describe, it, expect } from 'vitest';
import {
  detectChurnTransitions,
  isAlertingSnapshot,
  parseStoredSnapshots,
  snapshotFingerprint,
  snapshotFromPolar,
  snapshotsFingerprint,
  type TeacherProSubSnapshot,
} from '../teacherProChurnWatch';

const active: TeacherProSubSnapshot = {
  id: 'sub_1',
  status: 'active',
  cancelAtPeriodEnd: false,
  email: 'lessons.wings@example.com',
  amount: 900,
  currency: 'usd',
  currentPeriodEnd: '2026-10-09T00:00:00.000Z',
  startedAt: '2026-09-09T00:00:00.000Z',
};

describe('snapshotFromPolar', () => {
  it('maps Polar payload fields and returns null without an id', () => {
    expect(snapshotFromPolar({})).toBeNull();
    expect(
      snapshotFromPolar({
        id: 'sub_1',
        status: 'active',
        cancel_at_period_end: false,
        amount: 900,
        currency: 'usd',
        current_period_end: '2026-10-09T00:00:00.000Z',
        started_at: '2026-09-09T00:00:00.000Z',
        customer: { email: 'a@b.c' },
      }),
    ).toEqual({
      id: 'sub_1',
      status: 'active',
      cancelAtPeriodEnd: false,
      email: 'a@b.c',
      amount: 900,
      currency: 'usd',
      currentPeriodEnd: '2026-10-09T00:00:00.000Z',
      startedAt: '2026-09-09T00:00:00.000Z',
    });
  });
});

describe('isAlertingSnapshot', () => {
  it('is silent for a healthy active sub', () => {
    expect(isAlertingSnapshot(active)).toBe(false);
  });

  it('alerts on past_due, canceled, unpaid, incomplete_expired, and cancel-at-period-end', () => {
    expect(isAlertingSnapshot({ ...active, status: 'past_due' })).toBe(true);
    expect(isAlertingSnapshot({ ...active, status: 'canceled' })).toBe(true);
    expect(isAlertingSnapshot({ ...active, status: 'unpaid' })).toBe(true);
    expect(isAlertingSnapshot({ ...active, status: 'incomplete_expired' })).toBe(true);
    expect(isAlertingSnapshot({ ...active, cancelAtPeriodEnd: true })).toBe(true);
  });
});

describe('detectChurnTransitions', () => {
  it('baselines a first healthy run without notifying', () => {
    const t = detectChurnTransitions(null, [active]);
    expect(t.shouldNotify).toBe(false);
    expect(t.reasons).toEqual([]);
  });

  it('notifies on a first run that is already past_due (do not miss existing churn)', () => {
    const t = detectChurnTransitions(null, [{ ...active, status: 'past_due' }]);
    expect(t.shouldNotify).toBe(true);
    expect(t.reasons.join(' ')).toContain('past_due');
  });

  it('notifies when Polar returns zero Teacher Pro subs on first run', () => {
    const t = detectChurnTransitions(null, []);
    expect(t.shouldNotify).toBe(true);
    expect(t.reasons[0]).toMatch(/no Teacher Pro subscriptions/i);
  });

  it('is silent when the fingerprint is unchanged', () => {
    const t = detectChurnTransitions([active], [{ ...active }]);
    expect(t.shouldNotify).toBe(false);
    expect(snapshotsFingerprint([active])).toBe(snapshotFingerprint(active));
  });

  it('notifies on active → past_due', () => {
    const t = detectChurnTransitions([active], [{ ...active, status: 'past_due' }]);
    expect(t.shouldNotify).toBe(true);
    expect(t.reasons.join(' ')).toMatch(/was active/);
  });

  it('notifies on cancel_at_period_end flipping true while still active', () => {
    const t = detectChurnTransitions([active], [{ ...active, cancelAtPeriodEnd: true }]);
    expect(t.shouldNotify).toBe(true);
    expect(t.reasons.join(' ')).toMatch(/cancel_at_period_end=true/);
  });

  it('notifies when the paying sub disappears from Polar', () => {
    const t = detectChurnTransitions([active], []);
    expect(t.shouldNotify).toBe(true);
    expect(t.missingIds).toEqual(['sub_1']);
    expect(t.reasons.join(' ')).toMatch(/emptied|disappeared/);
  });

  it('does not re-notify the same past_due snapshot the next day', () => {
    const past = { ...active, status: 'past_due' as const };
    const t = detectChurnTransitions([past], [past]);
    expect(t.shouldNotify).toBe(false);
  });
});

describe('parseStoredSnapshots', () => {
  it('returns null for empty/invalid payloads and round-trips a snapshot', () => {
    expect(parseStoredSnapshots(null)).toBeNull();
    expect(parseStoredSnapshots('not-json')).toBeNull();
    expect(parseStoredSnapshots('{}')).toBeNull();
    const raw = JSON.stringify([active]);
    expect(parseStoredSnapshots(raw)).toEqual([active]);
  });
});
