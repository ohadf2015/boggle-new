import { SCHOOL_LEAD_ADMIN_URL, type SchoolLeadDigestRow } from '@/lib/education/schoolLeadNotify';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function schoolLeadWeeklyDigest(
  leads: SchoolLeadDigestRow[],
  window: { startIso: string; endIso: string },
) {
  const n = leads.length;
  const rows = n === 0
    ? '<tr><td colspan="6">No school leads this week.</td></tr>'
    : leads.map((l) => `<tr>
<td>${escape(l.full_name)}</td>
<td>${escape(l.email)}</td>
<td>${escape(l.school_or_district)}</td>
<td>${escape(l.role)}</td>
<td>${escape(l.locale)}</td>
<td>${escape(l.created_at)}</td>
</tr>`).join('');

  return {
    subject: `School leads this week: ${n}`,
    html: `<h2>Weekly school-lead digest</h2>
<p>Window: ${escape(window.startIso)} → ${escape(window.endIso)} (${n} lead${n === 1 ? '' : 's'})</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Name</th><th>Email</th><th>School</th><th>Role</th><th>Locale</th><th>Timestamp</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<p><a href="${SCHOOL_LEAD_ADMIN_URL}">Open school-leads queue</a></p>`,
  };
}
