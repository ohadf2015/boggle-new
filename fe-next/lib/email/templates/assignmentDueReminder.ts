import type { TeacherLocale } from '@/lib/education/types';
import { reportsUrl, type TeacherReminderPlan } from '@/lib/education/assignmentDueReminders';
import { EMAIL_SITE, NEO_ACCENTS, NEO_COLORS, escapeHtml, renderNeoEmail, type NeoAccent, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { firstName } from './teacherEmailLayout';
import { ASSIGNMENT_DUE_COPY, type AssignmentDueCopy } from './assignmentDueReminder.copy';

function siteLocale(locale: string): string {
  return locale.toLowerCase().split('-')[0] || 'en';
}

function upgradeUrl(locale: string): string {
  return `${EMAIL_SITE}/${siteLocale(locale)}/teacher/upgrade`;
}

export interface AssignmentDueReminderEmail {
  fullName: string;
  locale: TeacherLocale;
  plan: TeacherReminderPlan;
  hasPro: boolean;
  /** Paid Pro or a live access trial: the reports are Pro only, so a free teacher gets no link into them. */
  canOpenReport: boolean;
}

function copyFor(locale: TeacherLocale): AssignmentDueCopy {
  return ASSIGNMENT_DUE_COPY[locale] ?? ASSIGNMENT_DUE_COPY.en;
}

function listHtml(
  items: TeacherReminderPlan['dueSoon'],
  args: AssignmentDueReminderEmail,
  copy: AssignmentDueCopy,
  accent: NeoAccent,
): string {
  const align = copy.dir === 'rtl' ? 'right' : 'left';
  const rows = items
    .map((n) => {
      const label = `${escapeHtml(n.classroomName)} · ${escapeHtml(n.title)}`;
      const item = args.canOpenReport
        ? `<a href="${escapeHtml(reportsUrl(args.locale, n.classroomId))}" style="color:${NEO_COLORS.ink};text-decoration:underline;">${label}</a>`
        : label;
      return `<tr><td dir="${copy.dir}" align="${align}" style="padding:10px 14px;border-bottom:2px solid ${NEO_COLORS.black};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.4;color:${NEO_COLORS.ink};text-align:${align};"><strong>${item}</strong><br><span style="display:inline-block;margin-top:6px;background:${NEO_ACCENTS[accent]};border:2px solid ${NEO_COLORS.black};border-radius:4px;padding:2px 8px;font-size:13px;font-weight:700;">${escapeHtml(copy.missing(n.missingCount))}</span></td></tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${copy.dir}" style="margin:0 0 20px 0;background:${NEO_COLORS.white};border:3px solid ${NEO_COLORS.black};border-bottom-width:1px;">${rows}</table>`;
}

function section(
  items: TeacherReminderPlan['dueSoon'],
  title: string,
  intro: string,
  accent: NeoAccent,
  args: AssignmentDueReminderEmail,
  copy: AssignmentDueCopy,
): NeoBlock[] {
  if (items.length === 0) return [];
  return [
    { type: 'p', text: title, strong: true },
    { type: 'p', text: intro },
    { type: 'html', html: listHtml(items, args, copy, accent) },
  ];
}

export function assignmentDueReminderEmail(args: AssignmentDueReminderEmail): { subject: string; html: string } {
  const copy = copyFor(args.locale);
  const { dueSoon, overdue } = args.plan;
  const overdueCount = overdue.reduce((sum, n) => sum + n.missingCount, 0);
  const state = overdue.length > 0 && dueSoon.length > 0 ? 'both' : overdue.length > 0 ? 'overdue' : 'dueSoon';
  const subject =
    state === 'both'
      ? copy.subjectBoth()
      : state === 'overdue'
        ? copy.subjectOverdue(overdueCount)
        : copy.subjectDueSoon(dueSoon[0]?.title || copy.fallbackTitle);

  const primaryClassroom = overdue[0]?.classroomId ?? dueSoon[0]?.classroomId ?? '';
  const report = { label: copy.openReport, href: reportsUrl(args.locale, primaryClassroom) };
  const upgrade = { label: copy.cta, href: upgradeUrl(args.locale) };
  const reportIsMain = args.canOpenReport || args.hasPro;

  const blocks: NeoBlock[] = [
    ...section(overdue, copy.overdueTitle, copy.overdueIntro, 'pink', args, copy),
    ...section(dueSoon, copy.dueSoonTitle, copy.dueSoonIntro, 'cyan', args, copy),
  ];
  if (!args.hasPro && !reportIsMain) blocks.push({ type: 'callout', text: copy.ctaNote });

  const html = renderNeoEmail({
    lang: args.locale,
    dir: copy.dir,
    preheader: state === 'dueSoon' ? copy.preheaderDueSoon : copy.preheaderOverdue,
    accent: state === 'dueSoon' ? 'cyan' : 'orange',
    art: state === 'dueSoon' ? 'hourglass' : 'report',
    kicker: copy.kicker,
    headline: state === 'both' ? copy.headlineBoth : state === 'overdue' ? copy.headlineOverdue : copy.headlineDueSoon,
    greeting: copy.greeting(firstName(args.fullName) || args.fullName),
    blocks,
    cta: reportIsMain ? report : upgrade,
    secondary: reportIsMain && !args.hasPro ? upgrade : undefined,
    signoff: copy.signoff,
    footnote: reportIsMain && !args.hasPro ? copy.ctaNote : undefined,
  });

  return { subject, html };
}
