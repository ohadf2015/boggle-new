import { describe, it, expect } from 'vitest';
import { schoolLeadAdminNotify } from '../schoolLeadAdminNotify';
import { schoolLeadWeeklyDigest } from '../schoolLeadWeeklyDigest';
import { schoolLeadDigestWindow, SCHOOL_LEAD_NOTIFY_TO } from '@/lib/education/schoolLeadNotify';

const lead = {
  email: 'principal@lincoln-high.edu',
  full_name: 'Dana Levi',
  role: 'school_admin' as const,
  school_or_district: 'Lincoln High School',
  student_count: '500_2000' as const,
  interests: ['pricing_info'] as const,
  country: 'US',
  message: 'We have 6 ESL teachers.',
  locale: 'en' as const,
  source: 'classroom-plan' as const,
};

describe('school lead notify templates', () => {
  it('admin notify includes name, email, school, role, locale, timestamp', () => {
    const out = schoolLeadAdminNotify({ ...lead, submittedAt: '2026-09-11T12:00:00.000Z' });
    expect(out.subject).toMatch(/Lincoln High School/);
    expect(out.html).toContain('Dana Levi');
    expect(out.html).toContain('principal@lincoln-high.edu');
    expect(out.html).toContain('Lincoln High School');
    expect(out.html).toContain('school_admin');
    expect(out.html).toContain('en');
    expect(out.html).toContain('2026-09-11T12:00:00.000Z');
  });

  it('escapes HTML in user-provided fields', () => {
    const out = schoolLeadAdminNotify({ ...lead, full_name: '<script>alert(1)</script>' });
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
  });

  it('weekly digest lists each lead and a 0-state', () => {
    const window = { startIso: '2026-09-04T07:00:00.000Z', endIso: '2026-09-11T07:00:00.000Z' };
    const empty = schoolLeadWeeklyDigest([], window);
    expect(empty.subject).toBe('School leads this week: 0');
    expect(empty.html).toContain('No school leads this week');

    const one = schoolLeadWeeklyDigest([{
      full_name: 'Dana Levi',
      email: 'principal@lincoln-high.edu',
      school_or_district: 'Lincoln High School',
      role: 'school_admin',
      locale: 'he',
      created_at: '2026-09-10T12:00:00.000Z',
    }], window);
    expect(one.subject).toBe('School leads this week: 1');
    expect(one.html).toContain('Dana Levi');
    expect(one.html).toContain('he');
  });

  it('digest window is the trailing 7 days', () => {
    const w = schoolLeadDigestWindow(new Date('2026-09-11T07:00:00.000Z'));
    expect(w.endIso).toBe('2026-09-11T07:00:00.000Z');
    expect(w.startIso).toBe('2026-09-04T07:00:00.000Z');
  });

  it('notify address is Ohad, not the public game inbox', () => {
    expect(SCHOOL_LEAD_NOTIFY_TO).toBe('ohadf2015@gmail.com');
  });
});
