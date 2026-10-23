import { describe, it, expect } from 'vitest';
import { hasProAccess } from '@/lib/education/teacherPlanGate';

describe('hasProAccess (the client mirror of the server entitlement)', () => {
  const now = Date.parse('2026-10-23T12:00:00Z');
  it('is true for paid Pro', () => expect(hasProAccess({ hasPro: true, accessTrialExpires: null }, now)).toBe(true));
  it('is true while the access trial is live', () =>
    expect(hasProAccess({ hasPro: false, accessTrialExpires: '2027-09-29T00:00:00Z' }, now)).toBe(true));
  it('is false once the access trial has lapsed', () =>
    expect(hasProAccess({ hasPro: false, accessTrialExpires: '2026-10-01T00:00:00Z' }, now)).toBe(false));
  it('is false for a plain free teacher', () => expect(hasProAccess({ hasPro: false, accessTrialExpires: null }, now)).toBe(false));
});
