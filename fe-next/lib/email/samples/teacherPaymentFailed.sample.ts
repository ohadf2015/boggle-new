import { teacherPaymentFailed } from '../templates/teacherPaymentFailed';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  [
    { name: 'dated', renewalDate: '2026-11-09T00:00:00Z' as string | null },
    { name: 'undated', renewalDate: null },
  ].map((v) => ({
    name: `teacherPaymentFailed.${v.name}`,
    locale,
    render: () =>
      teacherPaymentFailed({ full_name: 'Dana Levi', locale, portalUrl: 'https://polar.sh/portal/session_123?a=1&b=2', renewalDate: v.renewalDate }),
  })),
);
