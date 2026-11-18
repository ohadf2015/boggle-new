import { teacherDunningEscalation } from '../templates/teacherDunningEscalation';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherDunningEscalation.day5',
  locale,
  render: () =>
    teacherDunningEscalation({
      full_name: 'Dana Levi',
      locale,
      portalUrl: 'https://www.lexiclash.live/api/subscription/recover?t=signed&locale=en',
    }),
}));
