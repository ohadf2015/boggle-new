'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DrillTarget, EduDashboard } from '@/lib/admin/eduDashboard';
import type { PeriodDelta, TeacherHealth } from '@/lib/admin/eduMetrics';

export type EduDashboardView = EduDashboard;

export type Translate = (key: string, fallback?: string, params?: Record<string, string | number>) => string;

/** What the teacher or class list below is currently narrowed to. */
export interface ActiveDrill extends DrillTarget {
  title: string;
}

export const PANEL = 'rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/95 p-3';
export const MUTED = 'text-neo-cream/70';
export const CHIP_ON = 'border-neo-cream bg-neo-cream text-neo-navy';
export const CHIP_OFF = 'border-neo-cream/40 text-neo-cream';

export function formatDelta(delta: PeriodDelta | null): string | null {
  if (!delta || delta.pct === null) return null;
  const sign = delta.pct > 0 ? '+' : '';
  return `${sign}${delta.pct}%`;
}

/** The change against the previous window, in words an owner reads without a legend. */
export function deltaSentence(delta: PeriodDelta, windowDays: number, t: Translate): string {
  if (delta.prior === 0) {
    return delta.current === 0
      ? t('admin.eduDashboard.delta.noneEither', 'None in the previous {days} days either', { days: windowDays })
      : t('admin.eduDashboard.delta.fromZero', 'Up from 0 in the previous {days} days', { days: windowDays });
  }
  return t('admin.eduDashboard.delta.vsPrior', '{pct} vs the previous {days} days (was {prior})', {
    pct: formatDelta(delta) ?? '0%',
    days: windowDays,
    prior: delta.prior,
  });
}

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

export function shortDate(iso: string | null, language: string): string {
  return iso ? new Date(iso).toLocaleDateString(language) : '—';
}

export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(id);
  }, []);
  return entered;
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
