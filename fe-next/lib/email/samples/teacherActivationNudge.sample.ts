import { teacherActivationNudge } from '../templates/teacherActivationNudge';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (['d1', 'd3', 'd7'] as const).map((bucket) => ({
    name: `teacherActivationNudge.${bucket}`,
    locale,
    render: () => teacherActivationNudge({ full_name: 'Dana Levi', locale, bucket }),
  })),
);
