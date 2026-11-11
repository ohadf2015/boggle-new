import { teacherTrialFeedback } from '../templates/teacherTrialFeedback';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherTrialFeedback.checkin',
  locale,
  render: () => teacherTrialFeedback({ full_name: 'Dana Levi', locale, trialExpiresAt: '2026-11-20T18:00:00Z' }),
}));
