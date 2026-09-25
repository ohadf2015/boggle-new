import type { TeacherLocale } from '@/lib/education/types';
import type { WeeklyTeacherDigest } from '@/lib/education/weeklyTeacherDigest';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE = 'https://www.lexiclash.live';

function upgradeUrl(locale: string): string {
  const loc = locale.toLowerCase().split('-')[0] || 'en';
  return `${SITE}/${loc}/teacher/upgrade`;
}

function dashboardUrl(locale: string): string {
  const loc = locale.toLowerCase().split('-')[0] || 'en';
  return `${SITE}/${loc}/teacher`;
}

interface Copy {
  subject: (n: number) => string;
  greeting: (name: string) => string;
  intro: string;
  classroom: string;
  completion: string;
  accuracy: string;
  active: string;
  cta: string;
  trialEndedCta: string;
  trialEndedLine: string;
  ctaNote: string;
  openDashboard: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
  na: string;
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subject: (n) => (n === 1 ? 'Your class this week' : `Your ${n} classes this week`),
    greeting: (n) => `Hi ${n},`,
    intro: 'Here is 7-day completion and accuracy for each classroom.',
    classroom: 'Class',
    completion: 'Completion',
    accuracy: 'Accuracy',
    active: 'Students who played',
    cta: `Start Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mo`,
    trialEndedCta: 'Reactivate Teacher Pro',
    trialEndedLine: 'Your Teacher Pro trial ended — keep reports and unlimited classes for $9/mo.',
    ctaNote: 'Unlimited classes, printable reports, Polar checkout. Cancel anytime.',
    openDashboard: 'Open teacher dashboard',
    signoff: '— LexiClash',
    dir: 'ltr',
    na: '—',
  },
  he: {
    subject: (n) => (n === 1 ? 'הכיתה שלך השבוע' : `${n} הכיתות שלך השבוע`),
    greeting: (n) => `שלום ${n},`,
    intro: 'השלמה ודיוק ל-7 ימים לכל כיתה.',
    classroom: 'כיתה',
    completion: 'השלמה',
    accuracy: 'דיוק',
    active: 'תלמידים ששיחקו',
    cta: `התחלת Teacher Pro — $${TEACHER_PRO_PRICE_USD}/חודש`,
    trialEndedCta: 'הפעל מחדש את Teacher Pro',
    trialEndedLine: 'תקופת הניסיון של Teacher Pro הסתיימה — המשך ב-$9 לחודש.',
    ctaNote: 'כיתות ללא הגבלה, דוחות להדפסה, תשלום Polar. ביטול בכל עת.',
    openDashboard: 'ללוח המורה',
    signoff: '— LexiClash',
    dir: 'rtl',
    na: '—',
  },
};

function copyFor(locale: string): Copy {
  const loc = locale.toLowerCase().split('-')[0] as TeacherLocale;
  return COPY[loc] ?? COPY.en;
}

export function teacherWeeklyProgressDigest(digest: WeeklyTeacherDigest): { subject: string; html: string } {
  const c = copyFor(digest.locale);
  const n = digest.classrooms.length;
  const rows = digest.classrooms
    .map((cl) => {
      const p = cl.progress;
      const completion = p.completionPct == null ? c.na : `${p.completionPct}%`;
      const accuracy = p.accuracyPct == null ? c.na : `${p.accuracyPct}%`;
      return `<tr>
<td>${escape(cl.classroomName)}</td>
<td>${escape(completion)}</td>
<td>${escape(accuracy)}</td>
<td>${p.activeCount}/${p.rosterCount}</td>
</tr>`;
    })
    .join('');

  const expiredLine = digest.polarTrialExpiredLineKey
    ? `<p style="color:#0b1220;font-size:15px;font-weight:700">${escape(c.trialEndedLine)}</p>`
    : '';

  const cta = digest.hasPro
    ? ''
    : `${expiredLine}<p style="margin:24px 0">
<a href="${upgradeUrl(digest.locale)}" style="display:inline-block;background:#ff4d8d;color:#0b1220;font-weight:800;padding:12px 20px;text-decoration:none;border-radius:8px">${escape(digest.polarTrialExpired ? c.trialEndedCta : c.cta)}</a>
</p>
<p style="color:#555;font-size:13px">${escape(c.ctaNote)}</p>`;

  return {
    subject: c.subject(n),
    html: `<div dir="${c.dir}" style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escape(c.greeting(digest.fullName))}</p>
<p>${escape(c.intro)}</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
<thead><tr><th>${escape(c.classroom)}</th><th>${escape(c.completion)}</th><th>${escape(c.accuracy)}</th><th>${escape(c.active)}</th></tr></thead>
<tbody>${rows}</tbody>
</table>
${cta}
<p><a href="${dashboardUrl(digest.locale)}">${escape(c.openDashboard)}</a></p>
<p>${escape(c.signoff)}</p>
</div>`,
  };
}

export const TEACHER_WEEKLY_DIGEST_UPGRADE_PATH = '/teacher/upgrade';
