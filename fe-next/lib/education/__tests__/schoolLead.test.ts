import { describe, it, expect } from 'vitest';
import {
  validateSchoolLeadPayload,
  SCHOOL_LEAD_ROLES,
  STUDENT_COUNT_BUCKETS,
  SCHOOL_LEAD_INTERESTS,
} from '../schoolLead';

const valid = {
  email: 'principal@lincoln-high.edu',
  full_name: 'Dana Levi',
  role: 'school_admin',
  school_or_district: 'Lincoln High School',
  student_count: '500_2000',
  interests: ['district_admin_dashboard', 'pricing_info'],
  country: 'US',
  message: 'We have 6 ESL teachers who already use it.',
  locale: 'en',
};

describe('validateSchoolLeadPayload', () => {
  it('accepts a fully-qualified lead and returns a normalized payload', () => {
    const r = validateSchoolLeadPayload(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.email).toBe('principal@lincoln-high.edu');
      expect(r.payload.student_count).toBe('500_2000');
      expect(r.payload.interests).toEqual(['district_admin_dashboard', 'pricing_info']);
    }
  });

  it('accepts empty interests (interest is optional, the org fields qualify)', () => {
    const r = validateSchoolLeadPayload({ ...valid, interests: [] });
    expect(r.ok).toBe(true);
  });

  it('defaults missing interests to an empty array', () => {
    const { interests, ...noInterests } = valid;
    const r = validateSchoolLeadPayload(noInterests);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.interests).toEqual([]);
  });

  it('dedupes repeated interests', () => {
    const r = validateSchoolLeadPayload({ ...valid, interests: ['analytics', 'analytics', 'sso'] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.interests).toEqual(['analytics', 'sso']);
  });

  it('rejects bad json / non-object', () => {
    expect(validateSchoolLeadPayload(null).ok).toBe(false);
    expect(validateSchoolLeadPayload('x').ok).toBe(false);
  });

  it('rejects malformed email', () => {
    expect(validateSchoolLeadPayload({ ...valid, email: 'nope' }).ok).toBe(false);
  });

  it('rejects short full_name', () => {
    expect(validateSchoolLeadPayload({ ...valid, full_name: 'A' }).ok).toBe(false);
  });

  it('rejects unknown role', () => {
    expect(validateSchoolLeadPayload({ ...valid, role: 'janitor' }).ok).toBe(false);
  });

  it('requires a school_or_district (the payer entity)', () => {
    expect(validateSchoolLeadPayload({ ...valid, school_or_district: '' }).ok).toBe(false);
  });

  it('rejects unknown student_count bucket', () => {
    expect(validateSchoolLeadPayload({ ...valid, student_count: 'a_lot' }).ok).toBe(false);
  });

  it('rejects an unknown interest value', () => {
    expect(validateSchoolLeadPayload({ ...valid, interests: ['free_pizza'] }).ok).toBe(false);
  });

  it('rejects message over 800 chars', () => {
    expect(validateSchoolLeadPayload({ ...valid, message: 'x'.repeat(801) }).ok).toBe(false);
  });

  it('rejects unknown locale', () => {
    expect(validateSchoolLeadPayload({ ...valid, locale: 'fr' }).ok).toBe(false);
  });

  it('exposes the role / bucket / interest registries for the form to render', () => {
    expect(SCHOOL_LEAD_ROLES).toContain('district_admin');
    expect(STUDENT_COUNT_BUCKETS).toContain('gte_2000');
    expect(SCHOOL_LEAD_INTERESTS).toContain('content_libraries');
  });
});
