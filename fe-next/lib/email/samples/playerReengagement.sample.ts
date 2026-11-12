import { playerReengagement } from '../templates/playerReengagement';
import { getWelcomeEmailModes } from '../welcomeModes';
import { EMAIL_SITE } from '../kit/neoEmail';
import { TEACHER_LOCALES, type EmailSample } from './types';

const PERSON: Record<string, { name: string; letter: string }> = {
  en: { name: 'Maya', letter: 'S' },
  he: { name: 'נועה', letter: 'ש' },
  sv: { name: 'Erik', letter: 'K' },
  ja: { name: 'Yuki', letter: 'さ' },
  es: { name: 'Carlos', letter: 'P' },
  ru: { name: 'Саша', letter: 'К' },
};

const VARIANTS = {
  hooks: { wordLength: 5, daysSinceLastPlay: 14, playersToday: 1847, hoursUntilReset: 6 },
  plain: {},
} as const;

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]).map((variant) => ({
    name: `playerReengagement.${variant}`,
    locale,
    needsUnsubscribe: true,
    render: () =>
      playerReengagement({
        recipientName: PERSON[locale].name,
        firstLetter: PERSON[locale].letter,
        language: locale,
        unsubscribeUrl: `${EMAIL_SITE}/api/email/unsubscribe?token=sample`,
        playUrl: `${EMAIL_SITE}/${locale}/daily`,
        modes: getWelcomeEmailModes(locale, EMAIL_SITE),
        ...VARIANTS[variant],
      }),
  })),
);
