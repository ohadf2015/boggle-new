/**
 * Weekly classroom report as plain text a teacher pastes straight into an
 * email to parents/admins. Pure: the caller fetches (useWeeklyProgressDigest)
 * and passes `t` so every line is translated. No HTML — email clients get
 * short labelled lines they can forward as-is.
 */
import { formatWowDelta } from './weeklyProgressDigest';

export interface WeeklyEmailReportInput {
  classroomName: string;
  /** Start of the 7-day window, ISO. Shown localized via Intl. */
  weekStartIso: string;
  studentsJoinedThisWeek: number;
  gamesPlayed: number;
  averageScorePct: number | null;
  /** Percentage-point delta vs last week. Null when either week is unrated. */
  scoreWowDeltaPct: number | null;
  wordsMasteredThisWeek: number;
}

export interface WeeklyEmailReportText {
  subject: string;
  body: string;
}

type T = (key: string, params?: Record<string, string | number>) => string;

function formatWeekStart(weekStartIso: string, locale: string): string {
  const date = new Date(weekStartIso);
  if (Number.isNaN(date.getTime())) return weekStartIso;
  try {
    return new Intl.DateTimeFormat(locale || 'en', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return weekStartIso;
  }
}

function scoreLine(t: T, input: WeeklyEmailReportInput): string {
  if (input.averageScorePct == null) return t('teacher.digest.emailReportScoreUnknown');
  if (input.scoreWowDeltaPct == null) {
    return t('teacher.digest.emailReportScoreFlat', { score: input.averageScorePct });
  }
  return t('teacher.digest.emailReportScore', {
    score: input.averageScorePct,
    delta: formatWowDelta(input.scoreWowDeltaPct),
  });
}

export function buildWeeklyEmailReport(
  t: T,
  input: WeeklyEmailReportInput,
  locale: string = 'en',
): WeeklyEmailReportText {
  const subject = t('teacher.digest.emailReportSubject', { classroom: input.classroomName });
  const lines = [
    t('teacher.digest.emailReportGreeting'),
    '',
    t('teacher.digest.emailReportIntro', {
      classroom: input.classroomName,
      weekStart: formatWeekStart(input.weekStartIso, locale),
    }),
    t('teacher.digest.emailReportStudentsJoined', { count: input.studentsJoinedThisWeek }),
    t('teacher.digest.emailReportGamesPlayed', { count: input.gamesPlayed }),
    scoreLine(t, input),
    t('teacher.digest.emailReportWordsMastered', { count: input.wordsMasteredThisWeek }),
    '',
    t('teacher.digest.emailReportSignoff'),
  ];
  return { subject, body: lines.join('\n') };
}

export function buildWeeklyEmailMailto(text: WeeklyEmailReportText): string {
  return `mailto:?subject=${encodeURIComponent(text.subject)}&body=${encodeURIComponent(text.body)}`;
}
