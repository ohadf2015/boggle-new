'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { TeacherRow } from '@/lib/admin/eduDashboard';
import type { TeacherHealth } from '@/lib/admin/eduMetrics';
import { healthLabel, MUTED, PANEL, useEntered } from './eduDashboardShared';

const SEGMENTS: Array<{ key: TeacherHealth; bar: string }> = [
  { key: 'thriving', bar: 'bg-neo-lime' },
  { key: 'at_risk', bar: 'bg-neo-yellow' },
  { key: 'dormant', bar: 'bg-neo-red' },
];

export function EduHealthBar({ rows }: { rows: TeacherRow[] }) {
  const { t } = useLanguage();
  const entered = useEntered();
  const counts: Record<TeacherHealth, number> = { thriving: 0, at_risk: 0, dormant: 0 };
  for (const r of rows) counts[r.health] += 1;
  const total = Math.max(1, rows.length);

  return (
    <div className={PANEL}>
      <h3 className="mb-2 text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.healthTitle', 'Teacher health')}</h3>
      <div className="flex h-2 overflow-hidden rounded-full bg-neo-cream/10">
        {SEGMENTS.map((s) => (
          <div
            key={s.key}
            className={`${s.bar} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
            style={{ width: entered ? `${(counts[s.key] / total) * 100}%` : '0%' }}
          />
        ))}
      </div>
      <ul className={`mt-3 grid grid-cols-3 gap-2 text-xs ${MUTED}`}>
        {SEGMENTS.map((s) => (
          <li key={s.key} data-testid={`health-${s.key}`}>
            <span className="block text-2xl font-bold tabular-nums text-neo-white">{counts[s.key]}</span>
            {t(`admin.eduDashboard.health.${s.key}`, healthLabel(s.key))}
          </li>
        ))}
      </ul>
    </div>
  );
}
