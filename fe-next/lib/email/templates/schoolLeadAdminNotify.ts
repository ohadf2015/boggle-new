import type { SchoolLeadPayload } from '@/lib/education/schoolLead';
import { SCHOOL_LEAD_ADMIN_URL } from '@/lib/education/schoolLeadNotify';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const COUNT_LABEL: Record<string, string> = {
  lt_50: '< 50 students',
  '50_200': '50–200 students',
  '200_500': '200–500 students',
  '500_2000': '500–2,000 students',
  gte_2000: '2,000+ students',
};

// Highest-intent signal first — a lead asking about pricing for a 2,000+ student
// district is the one to call back today. Surface that in the subject line.
export function schoolLeadAdminNotify(lead: SchoolLeadPayload & { submittedAt?: string }) {
  const wantsPricing = lead.interests.includes('pricing_info');
  const sizeLabel = COUNT_LABEL[lead.student_count] ?? lead.student_count;
  const hot = wantsPricing ? '💰 PRICING — ' : '';
  const submittedAt = lead.submittedAt || new Date().toISOString();
  return {
    subject: `${hot}School Lead — ${lead.school_or_district} (${sizeLabel})`,
    html: `<h2>New Classroom / For-Schools lead</h2>
<p><strong>Name:</strong> ${escape(lead.full_name)}</p>
<p><strong>Email:</strong> ${escape(lead.email)}</p>
<p><strong>School / District:</strong> ${escape(lead.school_or_district)}</p>
<p><strong>Role:</strong> ${escape(lead.role)}</p>
<p><strong>Locale:</strong> ${escape(lead.locale)}</p>
<p><strong>Timestamp:</strong> ${escape(submittedAt)}</p>
<p><strong>Size:</strong> ${escape(sizeLabel)}</p>
<p><strong>Country:</strong> ${escape(lead.country || '—')}</p>
<p><strong>Source:</strong> ${escape(lead.source)}</p>
<p><strong>Interested in:</strong> ${lead.interests.length ? lead.interests.map(escape).join(', ') : '—'}</p>
<p><strong>Message:</strong></p>
<blockquote>${escape(lead.message || '—')}</blockquote>
<p><a href="${SCHOOL_LEAD_ADMIN_URL}">Open school-leads queue</a></p>`,
  };
}
