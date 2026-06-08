import type { SchoolLeadPayload } from '@/lib/education/schoolLead';

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
export function schoolLeadAdminNotify(lead: SchoolLeadPayload) {
  const wantsPricing = lead.interests.includes('pricing_info');
  const sizeLabel = COUNT_LABEL[lead.student_count] ?? lead.student_count;
  const hot = wantsPricing ? '💰 PRICING — ' : '';
  return {
    subject: `${hot}School Lead — ${lead.school_or_district} (${sizeLabel})`,
    html: `<h2>New "For Schools" lead</h2>
<p><strong>School / District:</strong> ${escape(lead.school_or_district)}</p>
<p><strong>Size:</strong> ${escape(sizeLabel)}</p>
<p><strong>Contact:</strong> ${escape(lead.full_name)} — ${escape(lead.email)}</p>
<p><strong>Role:</strong> ${lead.role}</p>
<p><strong>Country:</strong> ${escape(lead.country || '—')}</p>
<p><strong>Locale:</strong> ${lead.locale}</p>
<p><strong>Interested in:</strong> ${lead.interests.length ? lead.interests.join(', ') : '—'}</p>
<p><strong>Message:</strong></p>
<blockquote>${escape(lead.message || '—')}</blockquote>`,
  };
}
