import type { TeacherAccessFormPayload } from '@/lib/education/types';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function teacherAccessAdminNotify(req: TeacherAccessFormPayload) {
  return {
    subject: `Teacher Access Request — ${req.full_name} (${req.locale.toUpperCase()})`,
    html: `<h2>New Teacher Access Request</h2>
<p><strong>Name:</strong> ${escape(req.full_name)}</p>
<p><strong>Email:</strong> ${escape(req.email)}</p>
<p><strong>Role:</strong> ${req.role}</p>
<p><strong>School/Org:</strong> ${escape(req.school_or_org || '—')}</p>
<p><strong>Country:</strong> ${escape(req.country || '—')}</p>
<p><strong>Locale:</strong> ${req.locale}</p>
<p><strong>Use case:</strong></p>
<blockquote>${escape(req.use_case)}</blockquote>
<p><a href="https://lexiclash.com/admin/teacher-access">Review in admin panel</a></p>`,
  };
}
