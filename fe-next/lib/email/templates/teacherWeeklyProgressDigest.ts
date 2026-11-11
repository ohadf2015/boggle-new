import type { TeacherLocale } from '@/lib/education/types';
import type { WeeklyTeacherDigest, WeeklyTeacherDigestClassroom } from '@/lib/education/weeklyTeacherDigest';
import { NEO_ACCENTS, NEO_COLORS, escapeHtml, renderNeoEmail, type NeoBlock } from '@/lib/email/kit/neoEmail';
import { firstName, teacherEmailUrl } from './teacherEmailLayout';
import { DIGEST_COPY, type DigestCopy } from './teacherWeeklyProgressDigest.copy';

function siteLocale(locale: string): string {
  return locale.toLowerCase().split('-')[0] || 'en';
}

function upgradeUrl(locale: string): string {
  return teacherEmailUrl(siteLocale(locale), '/teacher/upgrade', 'weekly_digest');
}

function dashboardUrl(locale: string): string {
  return teacherEmailUrl(siteLocale(locale), '/teacher', 'weekly_digest');
}

function copyFor(locale: string): DigestCopy {
  return DIGEST_COPY[siteLocale(locale) as TeacherLocale] ?? DIGEST_COPY.en;
}

const signed = (n: number) => `\u200E${n >= 0 ? '+' : ''}${n}`;
const pct = (v: number | null | undefined, c: DigestCopy) => (v == null ? c.na : `${v}%`);

function classCard(cl: WeeklyTeacherDigestClassroom, c: DigestCopy): string {
  const align = c.dir === 'rtl' ? 'right' : 'left';
  const m = cl.metrics.thisWeek;
  const assignments =
    m.assignmentCompletionPct == null ? `${m.assignmentCompleted}` : `${m.assignmentCompleted} (${m.assignmentCompletionPct}%)`;
  const cells: [string, string][] = [
    [c.active, `${cl.progress.activeCount}/${cl.progress.rosterCount}`],
    [c.games, `${m.gamesCompleted}`],
    [c.words, `${m.wordsCompleted}`],
    [c.assignmentsDone, assignments],
    [c.avgScore, pct(cl.metrics.averageScorePct, c)],
    [c.completion, pct(cl.progress.completionPct, c)],
    [c.accuracy, pct(cl.progress.accuracyPct, c)],
    [c.inactive, `${cl.metrics.inactiveCount}`],
    [c.wow, c.wowValue(signed(cl.metrics.wow.studentsActive), signed(cl.metrics.wow.gamesCompleted))],
  ];
  const cell = ([label, value]: [string, string]) =>
    `<td width="50%" dir="${c.dir}" align="${align}" valign="top" style="padding:8px 12px;font-family:Arial,Helvetica,sans-serif;color:${NEO_COLORS.ink};text-align:${align};"><div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${NEO_COLORS.muted};">${escapeHtml(label)}</div><div style="font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:18px;margin-top:2px;">${escapeHtml(value)}</div></td>`;
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) rows.push(`<tr>${cell(cells[i])}${cells[i + 1] ? cell(cells[i + 1]) : '<td></td>'}</tr>`);

  const inactiveNames = cl.metrics.students.filter((s) => s.inactive7d).map((s) => s.name).join(', ');
  const movers = cl.metrics.students
    .filter((s) => !s.inactive7d)
    .slice(0, 5)
    .map((s) => `${s.name}${s.accuracyDelta == null ? '' : ` ${signed(s.accuracyDelta)}`}`)
    .join(', ');
  const people = `<b>${escapeHtml(c.movers)}:</b> ${escapeHtml(movers || c.na)}<br><b>${escapeHtml(c.inactive)}:</b> ${escapeHtml(inactiveNames || String(cl.metrics.inactiveCount))}`;

  const side = c.dir === 'rtl' ? 'left' : 'right';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${c.dir}" style="margin:0 0 20px 0;background:${NEO_COLORS.white};border:3px solid ${NEO_COLORS.black};border-${side}-width:5px;border-bottom-width:5px;">
<tr><td colspan="2" dir="${c.dir}" align="${align}" style="background:${NEO_ACCENTS.cyan};border-bottom:3px solid ${NEO_COLORS.black};padding:10px 12px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:18px;color:${NEO_COLORS.ink};text-align:${align};">${escapeHtml(cl.classroomName)}</td></tr>
${rows.join('\n')}
<tr><td colspan="2" dir="${c.dir}" align="${align}" style="padding:10px 12px 12px 12px;border-top:2px dashed ${NEO_COLORS.black};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${NEO_COLORS.ink};text-align:${align};">${people}</td></tr>
</table>`;
}

export function teacherWeeklyProgressDigest(digest: WeeklyTeacherDigest): { subject: string; html: string } {
  const c = copyFor(digest.locale);
  const classes = digest.classrooms;
  const played = classes.reduce((sum, cl) => sum + cl.progress.activeCount, 0);
  const games = classes.reduce((sum, cl) => sum + cl.metrics.thisWeek.gamesCompleted, 0);
  const words = classes.reduce((sum, cl) => sum + cl.metrics.thisWeek.wordsCompleted, 0);

  const trialLine = digest.polarTrialExpiredLineKey
    ? c.trialEndedLine
    : digest.polarTrialDay7
      ? c.trialDay7Line
      : digest.polarTrialActiveLineKey
        ? c.trialActiveLine(digest.polarTrialDaysLeft ?? 0)
        : null;
  const showUpgrade = !digest.hasPro || digest.polarTrialActive;
  const ctaLabel = digest.polarTrialExpired
    ? c.trialEndedCta
    : digest.polarTrialDay7
      ? c.trialDay7Cta
      : digest.polarTrialActive
        ? c.trialActiveCta
        : c.cta;

  const blocks: NeoBlock[] = [
    { type: 'p', text: c.intro },
    {
      type: 'stats',
      items: [
        { value: String(played), label: c.totalPlayed },
        { value: String(games), label: c.totalGames },
        { value: String(words), label: c.totalWords },
      ],
    },
    ...classes.map((cl) => ({ type: 'html' as const, html: classCard(cl, c) })),
  ];
  if (showUpgrade && trialLine) blocks.push({ type: 'callout', text: trialLine });

  const dashboard = { label: c.openDashboard, href: dashboardUrl(digest.locale) };
  const html = renderNeoEmail({
    lang: siteLocale(digest.locale),
    dir: c.dir,
    preheader: c.preheader(played, games),
    accent: 'purple',
    art: 'report',
    kicker: c.kicker,
    headline: c.headline,
    greeting: c.greeting(firstName(digest.fullName) || digest.fullName),
    blocks,
    cta: showUpgrade ? { label: ctaLabel, href: upgradeUrl(digest.locale) } : dashboard,
    secondary: showUpgrade ? dashboard : undefined,
    signoff: c.signoff,
    footnote: showUpgrade ? c.ctaNote : undefined,
  });

  return { subject: c.subject(classes.length), html };
}

export const TEACHER_WEEKLY_DIGEST_UPGRADE_PATH = '/teacher/upgrade';
