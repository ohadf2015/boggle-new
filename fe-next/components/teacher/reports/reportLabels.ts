import type { StudentRecommendation } from '@/lib/supabase/analyticsTypes';

/**
 * The data layer emits machine codes (lib/supabase/analyticsReports.ts); the
 * copy lives in the locales. Shared by the on-screen reports AND the PDF so the
 * two can never drift — the PDF used to hardcode its own English. Keys are
 * literals so the reportsI18n contract test can scan and resolve them.
 */
export const RECOMMENDATION_LABEL_KEY: Record<StudentRecommendation, string> = {
  low_accuracy_focus: 'teacher.reports.recommendations.lowAccuracyFocus',
  practice_frequency: 'teacher.reports.recommendations.practiceFrequency',
  mastery_work: 'teacher.reports.recommendations.masteryWork',
};

export const ISSUE_LABEL_KEY = {
  low_accuracy: 'teacher.reports.issue.lowAccuracy',
  inactive: 'teacher.reports.issue.inactive',
} as const;

export type AttentionIssue = keyof typeof ISSUE_LABEL_KEY;

/** `t` as the reports use it — the context `t` is assignable to this. */
export type ReportT = (key: string, params?: Record<string, string | number>) => string;

/** Practice time through the locales: "1h 5m" is an English pattern. */
export function formatPracticeMinutes(t: ReportT, total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours > 0
    ? t('teacher.reports.practiceDuration', { hours, minutes })
    : t('teacher.reports.practiceDurationMinutesOnly', { minutes });
}

export function formatReportDate(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/** 0–100, safe on an empty denominator. */
export function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
