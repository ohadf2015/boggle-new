import { describe, it, expect } from 'vitest';
import { proNotice, schoolLeadNotice, teacherRequestNotice } from '../adminEvents';

describe('teacherRequestNotice', () => {
  it('names the teacher, their school and country, and links to the access queue', () => {
    const n = teacherRequestNotice({ full_name: 'Dana Levi', role: 'teacher', school_or_org: 'Oak School', country: 'IL', autoApproved: true });
    expect(n.kind).toBe('teacher_request');
    expect(n.title).toBe('New teacher joined: Dana Levi');
    expect(n.body).toBe('teacher · Oak School · IL · trial started');
    expect(n.link).toBe('/admin/teacher-access');
    expect(n.severity).toBe('normal');
  });

  it('says the request is waiting when it was not auto-approved, and skips empty fields', () => {
    const n = teacherRequestNotice({ full_name: 'Sam', role: 'tutor', autoApproved: false });
    expect(n.title).toBe('Teacher request waiting: Sam');
    expect(n.body).toBe('tutor');
  });
});

describe('schoolLeadNotice', () => {
  const lead = { full_name: 'Ana', school_or_district: 'Riverside District', student_count: '200_500', interests: ['demo'], role: 'admin' };

  it('is normal for a small lead and links to the leads queue', () => {
    const n = schoolLeadNotice(lead as never);
    expect(n.kind).toBe('school_lead');
    expect(n.severity).toBe('normal');
    expect(n.link).toBe('/admin/school-leads');
    expect(n.title).toBe('School lead: Riverside District');
    expect(n.body).toContain('200_500 students');
  });

  it('is high priority for a big school or explicit pricing interest', () => {
    expect(schoolLeadNotice({ ...lead, student_count: '500_2000' } as never).severity).toBe('high');
    expect(schoolLeadNotice({ ...lead, student_count: 'gte_2000' } as never).severity).toBe('high');
    expect(schoolLeadNotice({ ...lead, interests: ['pricing_info'] } as never).severity).toBe('high');
  });
});

describe('proNotice', () => {
  it('a new paying customer is high priority and deduped per subscription', () => {
    const n = proNotice({ event: 'paid', email: 'a@b.com', subscriptionId: 'sub_1' });
    expect(n).toMatchObject({ kind: 'pro_paid', severity: 'high', dedupeKey: 'pro:paid:sub_1', link: '/admin/teacher-pro' });
    expect(n.title).toBe('New paying Pro customer');
    expect(n.body).toBe('a@b.com');
  });

  it('trial start and end are normal priority', () => {
    expect(proNotice({ event: 'trial', subscriptionId: 's' })).toMatchObject({ kind: 'pro_trial', severity: 'normal', title: 'Pro trial started' });
    expect(proNotice({ event: 'ended', subscriptionId: 's' })).toMatchObject({ kind: 'pro_ended', severity: 'normal', title: 'Pro subscription ended' });
  });

  it('has no dedupe key without a subscription id', () => {
    expect(proNotice({ event: 'paid' }).dedupeKey).toBeUndefined();
  });
});
