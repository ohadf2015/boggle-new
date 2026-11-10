'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DrillTarget, EduDashboard } from '@/lib/admin/eduDashboard';
import type { TeacherHealth } from '@/lib/admin/eduMetrics';

export type EduDashboardView = EduDashboard;


/** What the teacher or class list below is currently narrowed to. */
export interface ActiveDrill extends DrillTarget {
  title: string;
}

export { PANEL, MUTED } from '../shared/panelStyles';
export { formatDelta, deltaSentence, type Translate } from '../shared/delta';
export { useEntered } from '../shared/TrendTile';
export const CHIP_ON = 'border-neo-cream bg-neo-cream text-neo-navy';
export const CHIP_OFF = 'border-neo-cream/40 text-neo-cream';

export function healthLabel(health: TeacherHealth): string {
  if (health === 'thriving') return 'Thriving';
  if (health === 'at_risk') return 'At risk';
  return 'Dormant';
}

const HEALTH_CLASS: Record<TeacherHealth, string> = {
  thriving: 'border-neo-lime text-neo-lime',
  at_risk: 'border-neo-yellow text-neo-yellow',
  dormant: 'border-neo-red text-neo-red',
};

export function HealthChip({ health }: { health: TeacherHealth }) {
  const { t } = useLanguage();
  return (
    <span className={`whitespace-nowrap rounded border px-2 py-0.5 text-xs ${HEALTH_CLASS[health]}`}>
      {t(`admin.eduDashboard.health.${health}`, healthLabel(health))}
    </span>
  );
}

const SUNDAY_UTC = Date.UTC(2024, 0, 7);

/** Weekday names, index 0 = Sunday, in UTC to match how rounds are bucketed. One formatter per call. */
export function weekdayLabels(language: string, width: 'short' | 'long'): string[] {
  const format = new Intl.DateTimeFormat(language, { weekday: width, timeZone: 'UTC' });
  return Array.from({ length: 7 }, (_, i) => format.format(SUNDAY_UTC + i * 86_400_000));
}

export const teacherName = (x: { id: string; name: string | null; email: string | null }) => x.name ?? x.email ?? x.id;

/** id -> teacher row, rebuilt only when the teacher list changes. */
export function useTeacherIndex(teachers: EduDashboardView['teachers']) {
  return useMemo(() => new Map(teachers.map((x) => [x.id, x])), [teachers]);
}

export function shortDate(iso: string | null, language: string): string {
  return iso ? new Date(iso).toLocaleDateString(language) : '—';
}

export const FUNNEL_LABEL_FALLBACK: Record<string, string> = {
  requested: 'Applied',
  approved: 'Approved',
  signin: 'Can sign in',
  classroom: 'Made a class',
  student: 'Has students',
};

export function classDetailPath(language: string, classId: string): string {
  return `/${language}/admin/education/class/${classId}`;
}

export function teacherAccessPath(language: string): string {
  return `/${language}/admin/teacher-access`;
}
