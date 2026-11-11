import { teacherGoodwillExtension } from '../templates/teacherGoodwillExtension';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherGoodwillExtension.extension',
  locale,
  render: () => teacherGoodwillExtension({ full_name: 'Dana Levi', locale, newExpiresAt: '2026-12-01T00:00:00Z' }),
}));
