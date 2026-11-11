import { teacherTrialReminder } from '../templates/teacherTrialReminder';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (['t-3', 't-0', 't+3'] as const).map((bucket) => ({
    name: `teacherTrialReminder.${bucket}`,
    locale,
    render: () => teacherTrialReminder({ full_name: 'Dana Levi', locale, bucket, trialExpiresAt: '2026-11-20T18:00:00Z' }),
  })),
);
