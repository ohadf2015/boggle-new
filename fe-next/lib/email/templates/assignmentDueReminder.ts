import type { TeacherLocale } from '@/lib/education/types';
import { reportsUrl, type TeacherReminderPlan } from '@/lib/education/assignmentDueReminders';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

const SITE = 'https://www.lexiclash.live';

function upgradeUrl(locale: string): string {
  const loc = locale.toLowerCase().split('-')[0] || 'en';
  return `${SITE}/${loc}/teacher/upgrade`;
}

interface Copy {
  subjectDueSoon: (title: string) => string;
  subjectOverdue: (n: number) => string;
  subjectBoth: () => string;
  greeting: (name: string) => string;
  dueSoonIntro: string;
  overdueIntro: string;
  missing: (n: number) => string;
  openReport: string;
  cta: string;
  ctaNote: string;
  signoff: string;
  dir: 'ltr' | 'rtl';
}

const COPY: Partial<Record<TeacherLocale, Copy>> & { en: Copy } = {
  en: {
    subjectDueSoon: (title) => `Homework due tomorrow: ${title}`,
    subjectOverdue: (n) =>
      n === 1 ? '1 student overdue — open the progress report' : `${n} students overdue — open the progress report`,
    subjectBoth: () => 'Due tomorrow + overdue homework',
    greeting: (n) => `Hi ${n},`,
    dueSoonIntro: 'Students still have time. Remind the class, or open the progress report to see who is missing.',
    overdueIntro: 'These assignments are past due. The progress report shows who still owes the work.',
    missing: (n) => (n === 1 ? '1 student missing' : `${n} students missing`),
    openReport: 'Open progress report',
    cta: `Start Teacher Pro — $${TEACHER_PRO_PRICE_USD}/mo`,
    ctaNote: 'Printable CSV, full reports, unlimited classes. Cancel anytime.',
    signoff: '— LexiClash',
    dir: 'ltr',
  },
  he: {
    subjectDueSoon: (title) => `שיעורי בית עד מחר: ${title}`,
    subjectOverdue: (n) =>
      n === 1 ? 'תלמיד אחד באיחור — פתחו את דוח ההתקדמות' : `${n} תלמידים באיחור — פתחו את דוח ההתקדמות`,
    subjectBoth: () => 'עד מחר + משימות באיחור',
    greeting: (n) => `שלום ${n},`,
    dueSoonIntro: 'עדיין יש זמן. הזכירו לכיתה, או פתחו את דוח ההתקדמות לראות מי חסר.',
    overdueIntro: 'המשימות האלה עברו את המועד. דוח ההתקדמות מראה למי עדיין חסר.',
    missing: (n) => (n === 1 ? 'תלמיד אחד חסר' : `${n} תלמידים חסרים`),
    openReport: 'פתחו את דוח ההתקדמות',
    cta: `התחלת Teacher Pro — $${TEACHER_PRO_PRICE_USD}/חודש`,
    ctaNote: 'ייצוא CSV, דוחות מלאים, כיתות ללא הגבלה. ביטול בכל עת.',
    signoff: '— LexiClash',
    dir: 'rtl',
  },
};

export interface AssignmentDueReminderEmail {
  fullName: string;
  locale: TeacherLocale;
  plan: TeacherReminderPlan;
  hasPro: boolean;
  /** Paid Pro or a live access trial: the reports are Pro only, so a free teacher gets no link into them. */
  canOpenReport: boolean;
}

function copyFor(locale: TeacherLocale): Copy {
  return COPY[locale] ?? COPY.en;
}

function listHtml(items: TeacherReminderPlan['dueSoon'], locale: TeacherLocale, linkReports: boolean): string {
  const copy = copyFor(locale);
  return items
    .map((n) => {
      const label = `${escape(n.classroomName)} — ${escape(n.title)}`;
      const item = linkReports ? `<a href="${escape(reportsUrl(locale, n.classroomId))}">${label}</a>` : label;
      return `<li>${item} (${escape(copy.missing(n.missingCount))})</li>`;
    })
    .join('');
}

export function assignmentDueReminderEmail(args: AssignmentDueReminderEmail): { subject: string; html: string } {
  const copy = copyFor(args.locale);
  const overdueCount = args.plan.overdue.reduce((sum, n) => sum + n.missingCount, 0);
  const subject =
    args.plan.overdue.length > 0 && args.plan.dueSoon.length > 0
      ? copy.subjectBoth()
      : args.plan.overdue.length > 0
        ? copy.subjectOverdue(overdueCount)
        : copy.subjectDueSoon(args.plan.dueSoon[0]?.title || 'assignment');

  const primaryClassroom =
    args.plan.overdue[0]?.classroomId ?? args.plan.dueSoon[0]?.classroomId ?? '';
  const reportHref = reportsUrl(args.locale, primaryClassroom);
  const upgradeHref = upgradeUrl(args.locale);

  const dueSoonBlock =
    args.plan.dueSoon.length > 0
      ? `<p>${escape(copy.dueSoonIntro)}</p><ul>${listHtml(args.plan.dueSoon, args.locale, args.canOpenReport)}</ul>`
      : '';
  const overdueBlock =
    args.plan.overdue.length > 0
      ? `<p>${escape(copy.overdueIntro)}</p><ul>${listHtml(args.plan.overdue, args.locale, args.canOpenReport)}</ul>`
      : '';

  const proCta = args.hasPro
    ? ''
    : `<p><a href="${escape(upgradeHref)}" data-testid="assignment-due-upgrade">${escape(copy.cta)}</a></p>
       <p>${escape(copy.ctaNote)}</p>`;

  const html = `<!doctype html>
<html lang="${escape(args.locale)}" dir="${copy.dir}">
<body>
  <p>${escape(copy.greeting(args.fullName))}</p>
  ${dueSoonBlock}
  ${overdueBlock}
  ${args.canOpenReport ? `<p><a href="${escape(reportHref)}" data-testid="assignment-due-report">${escape(copy.openReport)}</a></p>` : ''}
  ${proCta}
  <p>${escape(copy.signoff)}</p>
</body>
</html>`;

  return { subject, html };
}
