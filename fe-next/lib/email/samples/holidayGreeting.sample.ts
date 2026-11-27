import { holidayGreeting } from '../templates/holidayGreeting';
import { EMAIL_SITE } from '../kit/neoEmail';
import { TEACHER_LOCALES, type EmailSample } from './types';

const NAME: Record<string, string> = { en: 'Maya', he: 'נועה', sv: 'Erik', ja: 'Yuki', es: 'Carlos', ru: 'Саша' };

export const samples: EmailSample[] = (['hanukkah', 'christmas'] as const).flatMap((holiday) =>
  TEACHER_LOCALES.map((locale) => ({
    name: `holidayGreeting.${holiday}`,
    locale,
    needsUnsubscribe: true,
    render: () =>
      holidayGreeting({
        holiday,
        language: locale,
        recipientName: NAME[locale],
        unsubscribeUrl: `${EMAIL_SITE}/api/email/unsubscribe?token=sample`,
      }),
  })),
);
