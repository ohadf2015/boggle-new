import { teacherAccessConfirmation } from '../templates/teacherAccessConfirmation';
import { TEACHER_LOCALES, type EmailSample } from './types';

const DAY = 24 * 60 * 60 * 1000;

const VARIANTS = {
  trial: () => ({ trialExpiresAt: new Date(Date.now() + 14 * DAY).toISOString(), message: undefined }),
  trialWithNote: () => ({
    trialExpiresAt: new Date(Date.now() + 14 * DAY).toISOString(),
    message: 'Great to have your school on board.\nShout if the projector view gives you any trouble.',
  }),
  noTrial: () => ({ trialExpiresAt: null, message: undefined }),
  trialEnded: () => ({ trialExpiresAt: new Date(Date.now() - DAY).toISOString(), message: undefined }),
} as const;

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]).map((variant) => ({
    name: `teacherAccessConfirmation.${variant}`,
    locale,
    render: () => teacherAccessConfirmation({ full_name: 'Dana Levi', locale, ...VARIANTS[variant]() }),
  })),
);
