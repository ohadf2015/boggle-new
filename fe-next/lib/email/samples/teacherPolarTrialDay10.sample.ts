import { teacherPolarTrialDay10 } from '../templates/teacherPolarTrialDay10';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherPolarTrialDay10.day10',
  locale,
  render: () => teacherPolarTrialDay10({ full_name: 'Dana Levi', locale, trialExpiresAt: '2026-11-20T00:00:00Z', daysLeft: 4 }),
}));
