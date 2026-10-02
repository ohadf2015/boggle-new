import { describe, it, expect } from 'vitest';
import { validateSchoolLeadPayload } from '@/lib/education/schoolLead';
import { buildSchoolQuotePayload, studentBucketForTeachers, schoolQuoteErrorKey } from '../schoolQuote';

const base = {
  fullName: 'Dana Levi',
  email: 'Dana@School.org ',
  school: 'Herzl High',
  role: 'school_admin' as const,
  teachers: 6,
  message: '',
  requester: '',
  locale: 'en',
};

describe('studentBucketForTeachers', () => {
  it('maps a teacher head-count to the lead table student bucket', () => {
    expect(studentBucketForTeachers(1)).toBe('lt_50');
    expect(studentBucketForTeachers(3)).toBe('50_200');
    expect(studentBucketForTeachers(8)).toBe('200_500');
    expect(studentBucketForTeachers(30)).toBe('500_2000');
    expect(studentBucketForTeachers(120)).toBe('gte_2000');
  });
});

describe('buildSchoolQuotePayload', () => {
  it('builds a payload the existing school-lead validator accepts', () => {
    const payload = buildSchoolQuotePayload(base);
    const v = validateSchoolLeadPayload(payload);
    expect(v.ok).toBe(true);
    expect(payload.interests).toContain('pricing_info');
    expect(payload.source).toBe('teacher-upgrade');
  });

  it('writes the head-count and the requesting teacher into the message', () => {
    const payload = buildSchoolQuotePayload({ ...base, requester: 'Ms Rivera', message: 'Need it by May' });
    expect(payload.message).toContain('6');
    expect(payload.message).toContain('Ms Rivera');
    expect(payload.message).toContain('Need it by May');
    expect(payload.message!.length).toBeLessThanOrEqual(800);
  });

  it('falls back to English for a locale the lead table does not store', () => {
    expect(buildSchoolQuotePayload({ ...base, locale: 'ru' }).locale).toBe('en');
  });

  it('clamps an absurd head-count', () => {
    expect(buildSchoolQuotePayload({ ...base, teachers: -4 }).message).toContain('1');
    expect(buildSchoolQuotePayload({ ...base, teachers: 99999 }).student_count).toBe('gte_2000');
  });
});

describe('schoolQuoteErrorKey', () => {
  it('names the rate limit separately from a generic failure', () => {
    expect(schoolQuoteErrorKey(429)).toBe('eg2Pro.school.errorRateLimited');
    expect(schoolQuoteErrorKey(400)).toBe('eg2Pro.school.errorInvalid');
    expect(schoolQuoteErrorKey(500)).toBe('eg2Pro.school.errorGeneric');
  });
});
