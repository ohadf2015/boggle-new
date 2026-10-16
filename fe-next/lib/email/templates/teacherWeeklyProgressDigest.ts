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
  trialActiveCta: string;
  trialActiveLine: (days: number) => string;
  trialDay7Cta: string;
  trialDay7Line: string;
  games: string;
  words: string;
  assignments: string;
  wow: string;
  inactive: string;
  avgScore: string;
  movers: string;
  assignmentsDone: string;
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
    trialActiveCta: 'Keep Pro — $9/mo',
    trialActiveLine: (days) =>
      days <= 0
        ? 'Your Teacher Pro trial ends today — keep reports and unlimited classes for $9/mo.'
        : days === 1
          ? '1 day left in your Teacher Pro trial — keep reports and unlimited classes for $9/mo.'
          : `${days} days left in your Teacher Pro trial — keep reports and unlimited classes for $9/mo.`,
    trialDay7Cta: 'Upgrade to Teacher Pro — $9/mo',
    trialDay7Line:
      'Day 7 of your Teacher Pro trial — keep reports and unlimited classes for $9/mo.',
    games: 'Games',
    words: 'Words found',
    assignments: 'Assignments',
    wow: 'vs last week',
    inactive: 'Inactive 7d',
    avgScore: 'Avg score',
    movers: 'Student movement',
    assignmentsDone: 'Assignments done',
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
    trialActiveCta: 'להמשיך ב-Pro — 9$ לחודש',
    trialActiveLine: (days) =>
      days <= 0
        ? 'ניסיון Teacher Pro מסתיים היום — שמרו על דוחות וכיתות ללא הגבלה ב-9$ לחודש.'
        : days === 1
          ? 'נותר יום אחד בניסיון Teacher Pro — שמרו על דוחות וכיתות ללא הגבלה ב-9$ לחודש.'
          : `נותרו ${days} ימים בניסיון Teacher Pro — שמרו על דוחות וכיתות ללא הגבלה ב-9$ לחודש.`,
    trialDay7Cta: 'שדרוג ל-Teacher Pro — 9$ לחודש',
    trialDay7Line: 'יום 7 בניסיון Teacher Pro — שמרו על דוחות וכיתות ללא הגבלה ב-9$ לחודש.',
    games: 'משחקים',
    words: 'מילים שנמצאו',
    assignments: 'מטלות',
    wow: 'מול השבוע שעבר',
    inactive: 'לא פעילים 7 ימים',
    avgScore: 'ציון ממוצע',
    movers: 'תנועת תלמידים',
    assignmentsDone: 'מטלות שהושלמו',
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
      const m = cl.metrics.thisWeek;
      const wow = cl.metrics.wow;
      const completion = p.completionPct == null ? c.na : `${p.completionPct}%`;
      const accuracy = p.accuracyPct == null ? c.na : `${p.accuracyPct}%`;
      const assignments =
        m.assignmentCompletionPct == null
          ? `${m.assignmentCompleted}`
          : `${m.assignmentCompleted} (${m.assignmentCompletionPct}%)`;
      const avg = cl.metrics.averageScorePct == null ? c.na : `${cl.metrics.averageScorePct}%`;
      const wowLine = `${wow.studentsActive >= 0 ? '+' : ''}${wow.studentsActive} / ${wow.gamesCompleted >= 0 ? '+' : ''}${wow.gamesCompleted}`;
      const inactiveNames = cl.metrics.students
        .filter((s) => s.inactive7d)
        .map((s) => escape(s.name))
        .join(', ');
      const movers = cl.metrics.students
        .filter((s) => !s.inactive7d)
        .slice(0, 5)
        .map((s) => {
          const delta = s.accuracyDelta == null ? '' : ` ${s.accuracyDelta >= 0 ? '+' : ''}${s.accuracyDelta}`;
          return `${escape(s.name)}${escape(delta)}`;
        })
        .join(', ');
      return `<tr>
<td>${escape(cl.classroomName)}</td>
<td>${p.activeCount}/${p.rosterCount}</td>
<td>${m.gamesCompleted}</td>
<td>${m.wordsCompleted}</td>
<td>${escape(assignments)}</td>
<td>${escape(avg)}</td>
<td>${cl.metrics.inactiveCount}</td>
<td>${escape(completion)}</td>
<td>${escape(accuracy)}</td>
<td>${escape(wowLine)}</td>
</tr>
<tr><td colspan="10" style="font-size:13px;color:#333">${escape(c.movers)}: ${movers || c.na}. ${escape(c.inactive)}: ${inactiveNames || cl.metrics.inactiveCount}</td></tr>`;
    })
    .join('');

  const expiredLine = digest.polarTrialExpiredLineKey
    ? `<p style="color:#0b1220;font-size:15px;font-weight:700">${escape(c.trialEndedLine)}</p>`
    : '';
  const day7Line = digest.polarTrialDay7
    ? `<p style="color:#0b1220;font-size:15px;font-weight:700">${escape(c.trialDay7Line)}</p>`
    : '';
  const activeLine =
    digest.polarTrialActiveLineKey && !digest.polarTrialDay7
      ? `<p style="color:#0b1220;font-size:15px;font-weight:700">${escape(c.trialActiveLine(digest.polarTrialDaysLeft ?? 0))}</p>`
      : '';

  const showUpgrade = !digest.hasPro || digest.polarTrialActive;
  const ctaLabel = digest.polarTrialExpired
    ? c.trialEndedCta
    : digest.polarTrialDay7
      ? c.trialDay7Cta
      : digest.polarTrialActive
        ? c.trialActiveCta
        : c.cta;
  const cta = showUpgrade
    ? `${expiredLine}${day7Line}${activeLine}<p style="margin:24px 0">
<a href="${upgradeUrl(digest.locale)}" style="display:inline-block;background:#ff4d8d;color:#0b1220;font-weight:800;padding:12px 20px;text-decoration:none;border-radius:8px">${escape(ctaLabel)}</a>
</p>
<p style="color:#555;font-size:13px">${escape(c.ctaNote)}</p>`
    : '';

  return {
    subject: c.subject(n),
    html: `<div dir="${c.dir}" style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<p>${escape(c.greeting(digest.fullName))}</p>
<p>${escape(c.intro)}</p>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
<thead><tr><th>${escape(c.classroom)}</th><th>${escape(c.active)}</th><th>${escape(c.games)}</th><th>${escape(c.words)}</th><th>${escape(c.assignmentsDone)}</th><th>${escape(c.avgScore)}</th><th>${escape(c.inactive)}</th><th>${escape(c.completion)}</th><th>${escape(c.accuracy)}</th><th>${escape(c.wow)}</th></tr></thead>
<tbody>${rows}</tbody>
</table>
${cta}
<p><a href="${dashboardUrl(digest.locale)}">${escape(c.openDashboard)}</a></p>
<p>${escape(c.signoff)}</p>
</div>`,
  };
}

export const TEACHER_WEEKLY_DIGEST_UPGRADE_PATH = '/teacher/upgrade';
