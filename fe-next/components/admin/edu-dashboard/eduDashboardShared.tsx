'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EduDashboard } from '@/lib/admin/eduDashboard';
import type { PeriodDelta, TeacherHealth } from '@/lib/admin/eduMetrics';

export type EduDashboardView = EduDashboard & { roundsAvailable: boolean };

export function formatDelta(delta: PeriodDelta | null): string | null {
  if (!delta || delta.pct === null) return null;
  const sign = delta.pct > 0 ? '+' : '';
  return `${sign}${delta.pct}%`;
}

export function healthLabel(health: TeacherHealth): string {
  if (health === 'thriving') return 'Thriving';
  if (health === 'at_risk') return 'At risk';
  return 'Dormant';
}

const HEALTH_CLASS: Record<TeacherHealth, string> = {
  thriving: 'border-emerald-400 text-emerald-300',
  at_risk: 'border-amber-400 text-amber-300',
  dormant: 'border-red-400 text-red-300',
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
  requested: 'Requested',
  approved: 'Approved',
  classroom: 'Created a class',
  student: 'First student joined',
};
