import { teacherPolarTrialCanceledEnding } from '../templates/teacherPolarTrialCanceledEnding';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherPolarTrialCanceledEnding',
  locale,
  render: () => teacherPolarTrialCanceledEnding({ full_name: 'Dana Levi', locale, endsAt: '2026-12-06T19:21:51Z' }),
}));
