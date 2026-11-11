import { teacherProGift } from '../templates/teacherProGift';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  [false, true].map((pending) => ({
    name: `teacherProGift.${pending ? 'pending' : 'active'}`,
    locale,
    render: () =>
      teacherProGift({
        full_name: 'Dana Levi',
        locale,
        note: pending ? null : 'Thanks for the feedback on Thursday.\nYour class made my week.',
        expiresAt: '2027-06-30T12:00:00Z',
        pending,
      }),
  })),
);
