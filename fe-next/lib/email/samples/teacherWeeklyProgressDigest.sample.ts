import { teacherWeeklyProgressDigest } from '../templates/teacherWeeklyProgressDigest';
import { buildWeeklyTeacherDigest } from '@/lib/education/weeklyTeacherDigest';
import { TEACHER_LOCALES, type EmailSample } from './types';

const NOW = Date.parse('2026-11-11T12:00:00.000Z');
const DAY = 86_400_000;

function digest(locale: string, hasPro: boolean, polarTrialDaysLeft: number | null) {
  return buildWeeklyTeacherDigest({
    teacherId: 't1',
    email: 'dana@school.test',
    fullName: 'Dana Levi',
    locale,
    hasPro,
    polarTrialDaysLeft,
    now: NOW,
    classrooms: [
      {
        classroomId: 'c1',
        classroomName: '7B English',
        roster: [
          { studentId: 's1', name: 'Noa' },
          { studentId: 's2', name: 'Eli' },
          { studentId: 's3', name: 'Maya' },
        ],
        sessions: [
          { studentId: 's1', completedAt: new Date(NOW - DAY).toISOString(), foundCount: 12, missedCount: 3 },
          { studentId: 's2', completedAt: new Date(NOW - 2 * DAY).toISOString(), foundCount: 7, missedCount: 5 },
        ],
      },
      {
        classroomId: 'c2',
        classroomName: '8A Spelling',
        roster: [{ studentId: 's4', name: 'Omer' }],
        sessions: [{ studentId: 's4', completedAt: new Date(NOW - 3 * DAY).toISOString(), foundCount: 9, missedCount: 1 }],
      },
    ],
  });
}

const VARIANTS = {
  free: () => digest('en', false, null),
  trial: () => digest('en', true, 6),
  pro: () => digest('en', true, null),
} as const;

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  (Object.keys(VARIANTS) as (keyof typeof VARIANTS)[]).map((variant) => ({
    name: `teacherWeeklyProgressDigest.${variant}`,
    locale,
    render: () => teacherWeeklyProgressDigest({ ...VARIANTS[variant](), locale }),
  })),
);
