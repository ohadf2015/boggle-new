/**
 * What an admin hears about, and how it reads. Each builder turns one event into a
 * notice; call sites stay one-liners and the wording is testable. `high` means worth a
 * phone ping (revenue, big leads); everything else is bell-only.
 */

import type { SchoolLeadPayload } from '@/lib/education/schoolLead';

export type AdminSeverity = 'normal' | 'high';

export interface AdminNotice {
  kind: string;
  severity: AdminSeverity;
  title: string;
  body?: string;
  /** Admin route, without the locale prefix. */
  link?: string;
  /** Same key twice stores one row: a replayed webhook must not notify twice. */
  dedupeKey?: string;
}

const join = (parts: Array<string | undefined | null | false>) => parts.filter(Boolean).join(' · ');

export function teacherRequestNotice(p: {
  full_name: string;
  role: string;
  school_or_org?: string | null;
  country?: string | null;
  autoApproved: boolean;
}): AdminNotice {
  return {
    kind: 'teacher_request',
    severity: 'normal',
    title: `${p.autoApproved ? 'New teacher joined' : 'Teacher request waiting'}: ${p.full_name}`,
    body: join([p.role, p.school_or_org, p.country, p.autoApproved && 'trial started']),
    link: '/admin/teacher-access',
  };
}

const BIG_SCHOOLS: ReadonlySet<string> = new Set(['500_2000', 'gte_2000']);

export function schoolLeadNotice(lead: Pick<SchoolLeadPayload, 'full_name' | 'school_or_district' | 'student_count' | 'interests' | 'role'>): AdminNotice {
  const big = BIG_SCHOOLS.has(lead.student_count) || lead.interests.includes('pricing_info');
  return {
    kind: 'school_lead',
    severity: big ? 'high' : 'normal',
    title: `School lead: ${lead.school_or_district}`,
    body: join([lead.full_name, lead.role, `${lead.student_count} students`, lead.interests.length > 0 && lead.interests.join(', ')]),
    link: '/admin/school-leads',
  };
}

const PRO: Record<'trial' | 'paid' | 'ended', { kind: string; severity: AdminSeverity; title: string }> = {
  trial: { kind: 'pro_trial', severity: 'normal', title: 'Pro trial started' },
  paid: { kind: 'pro_paid', severity: 'high', title: 'New paying Pro customer' },
  ended: { kind: 'pro_ended', severity: 'normal', title: 'Pro subscription ended' },
};

export function proNotice(p: { event: 'trial' | 'paid' | 'ended'; email?: string | null; subscriptionId?: string | null }): AdminNotice {
  return {
    ...PRO[p.event],
    body: p.email || undefined,
    link: '/admin/teacher-pro',
    dedupeKey: p.subscriptionId ? `pro:${p.event}:${p.subscriptionId}` : undefined,
  };
}
