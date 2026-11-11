import { teacherAccessDecline } from '../templates/teacherAccessDecline';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (['reason', 'noReason'] as const).map((variant) => ({
    name: `teacherAccessDecline.${variant}`,
    locale,
    render: () =>
      teacherAccessDecline({
        full_name: 'Dana Levi',
        locale,
        reason: variant === 'reason' ? 'We could not confirm the school from the details given.' : undefined,
      }),
  })),
);
