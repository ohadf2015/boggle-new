import { teacherPolarTrialExpiry, type WinbackStats } from '../templates/teacherPolarTrialExpiry';
import { TEACHER_LOCALES, type EmailSample } from './types';

const VARIANTS: { name: string; bucket: 't-0' | 't+3' | 't+14' | 't+30'; stats: WinbackStats | null }[] = [
  { name: 't-0', bucket: 't-0', stats: null },
  { name: 't+3', bucket: 't+3', stats: null },
  { name: 't+14.classes', bucket: 't+14', stats: { classrooms: 3, gamesLast30d: 7 } },
  { name: 't+14.empty', bucket: 't+14', stats: null },
  { name: 't+30.classes', bucket: 't+30', stats: { classrooms: 1, gamesLast30d: 0 } },
  { name: 't+30.empty', bucket: 't+30', stats: { classrooms: 0, gamesLast30d: 0 } },
];

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  VARIANTS.map((v) => ({
    name: `teacherPolarTrialExpiry.${v.name}`,
    locale,
    render: () =>
      teacherPolarTrialExpiry({ full_name: 'Dana Levi', locale, bucket: v.bucket, trialExpiresAt: '2026-10-20T00:00:00Z', stats: v.stats }),
  })),
);
