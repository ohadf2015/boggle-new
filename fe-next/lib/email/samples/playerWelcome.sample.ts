import { playerWelcome } from '../templates/playerWelcome';
import { getWelcomeEmailModes } from '../welcomeModes';
import { EMAIL_SITE } from '../kit/neoEmail';
import { TEACHER_LOCALES, type EmailSample } from './types';

const NAMES: Record<string, string> = { en: 'Maya', he: 'מאיה', sv: 'Erik', ja: 'Yuki', es: 'Carlos', ru: 'Саша' };

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'playerWelcome',
  locale,
  needsUnsubscribe: true,
  render: () =>
    playerWelcome({
      recipientName: NAMES[locale],
      language: locale,
      unsubscribeUrl: `${EMAIL_SITE}/api/email/unsubscribe?token=sample`,
      playUrl: `${EMAIL_SITE}/${locale}`,
      videoUrl: `${EMAIL_SITE}/${locale}`,
      baseUrl: EMAIL_SITE,
      modes: getWelcomeEmailModes(locale, EMAIL_SITE),
    }),
}));
