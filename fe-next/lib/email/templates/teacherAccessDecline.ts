import type { TeacherLocale } from '@/lib/education/types';

interface Args { full_name: string; locale: TeacherLocale; reason?: string; }

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function teacherAccessDecline({ full_name, locale, reason }: Args) {
  const reasonLine = reason ? `<p><strong>Reason:</strong> ${escape(reason)}</p>` : '';
  return {
    subject: 'About your LexiClash teacher access request',
    html: `<p>Hi ${escape(full_name)},</p>
<p>Thanks for applying for teacher access. After review, we're not able to approve your request at this time.</p>
${reasonLine}
<p>You're welcome to try the regular game with friends — it's free:</p>
<p><a href="https://lexiclash.com/${locale}/multiplayer">Play LexiClash</a></p>
<p>If you'd like to reapply with more details, you can do so anytime at <a href="https://lexiclash.com/${locale}/education/access">/education/access</a>.</p>
<p>— LexiClash Team</p>`,
  };
}
