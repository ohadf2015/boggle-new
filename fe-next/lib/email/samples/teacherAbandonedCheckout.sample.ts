import { teacherAbandonedCheckout } from '../templates/teacherAbandonedCheckout';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (['paid', 'trial', 'keep', 'ended'] as const).map((mode) => ({
    name: `teacherAbandonedCheckout.${mode}`,
    locale,
    render: () => teacherAbandonedCheckout({ full_name: 'Dana Levi', locale, mode }),
  })),
);
