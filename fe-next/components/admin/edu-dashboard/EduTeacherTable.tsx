'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { TeacherRow } from '@/lib/admin/eduDashboard';
import type { TeacherHealth } from '@/lib/admin/eduMetrics';
import { CHIP_OFF, CHIP_ON, HealthChip, healthLabel, MUTED, PANEL, shortDate, type ActiveDrill } from './eduDashboardShared';

type Filter = 'all' | TeacherHealth;

export function DrillBanner({ drill, onClear }: { drill: ActiveDrill; onClear: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      data-testid="drill-banner"
      className="flex flex-wrap items-center justify-between gap-2 rounded border-2 border-neo-cyan bg-neo-cyan/10 px-3 py-2 text-sm text-neo-cream"
    >
      <span>
        <span className="font-semibold">{drill.title}</span>
        <span className={`ms-2 tabular-nums ${MUTED}`}>{drill.ids.length}</span>
      </span>
      <button type="button" onClick={onClear} className="text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline">
        {t('admin.eduDashboard.drill.clear', 'Show everyone')}
      </button>
    </div>
  );
}

export function EduTeacherTable({
  rows,
  drill,
  onClearDrill,
}: {
  rows: TeacherRow[];
  drill: ActiveDrill | null;
  onClearDrill: () => void;
}) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<Filter>('all');
  const [showDormant, setShowDormant] = useState(false);

  const thriving = rows.filter((r) => r.health === 'thriving');
  const atRisk = rows.filter((r) => r.health === 'at_risk').sort((a, b) => b.students - a.students);
  const dormant = rows.filter((r) => r.health === 'dormant');
  const rowOf = new Map(rows.map((r) => [r.id, r]));

  const visible = drill
    ? drill.ids.map((id) => rowOf.get(id)).filter((r): r is TeacherRow => !!r)
    : filter === 'thriving'
      ? thriving
      : filter === 'at_risk'
        ? atRisk
        : filter === 'dormant'
          ? dormant
          : [...thriving, ...atRisk, ...(showDormant ? dormant : [])];

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: 'all', label: t('admin.eduDashboard.teachers.filter.all', 'Not dormant'), count: thriving.length + atRisk.length },
    { key: 'thriving', label: t('admin.eduDashboard.health.thriving', healthLabel('thriving')), count: thriving.length },
    { key: 'at_risk', label: t('admin.eduDashboard.health.at_risk', healthLabel('at_risk')), count: atRisk.length },
    { key: 'dormant', label: t('admin.eduDashboard.health.dormant', healthLabel('dormant')), count: dormant.length },
  ];

  return (
    <section id="edu-teacher-table" data-testid="teacher-table" className={`${PANEL} space-y-3`}>
      <h3 className="text-sm font-semibold text-neo-cream">
        {t('admin.eduDashboard.teachers.all', 'All teachers')}
        <span className={`ms-2 tabular-nums ${MUTED}`}>{rows.length}</span>
      </h3>
      {drill ? (
        <DrillBanner drill={drill} onClear={onClearDrill} />
      ) : (
        <div role="group" aria-label={t('admin.eduDashboard.teachers.filterLabel', 'Filter by health')} className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded border px-2.5 py-1 text-xs font-semibold ${filter === c.key ? CHIP_ON : CHIP_OFF}`}
            >
              {c.label}
              <span className="ms-1.5 tabular-nums">{c.count}</span>
            </button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums text-neo-cream">
          <thead className={`text-start text-xs ${MUTED}`}>
            <tr>
              <th className="p-2 text-start">{t('admin.eduDashboard.teachers.name', 'Teacher')}</th>
              <th className="p-2 text-start">{t('admin.eduDashboard.teachers.lastActive', 'Last active')}</th>
              <th className="p-2 text-end">{t('admin.eduDashboard.teachers.classes', 'Classes')}</th>
              <th className="p-2 text-end">{t('admin.eduDashboard.teachers.students', 'Students')}</th>
              <th className="p-2 text-end">{t('admin.eduDashboard.teachers.rounds7d', 'Class games, last 7 days')}</th>
              <th className="p-2 text-start">{t('admin.eduDashboard.teachers.plan', 'Plan')}</th>
              <th className="p-2 text-start">{t('admin.eduDashboard.teachers.health', 'Health')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-neo-cream/10">
                <td className="p-2">
                  <Link href={teacherDetailPath(language, r.id)} className="font-semibold hover:underline">
                    {r.name ?? r.email ?? '—'}
                  </Link>
                  {!r.canSignIn && (
                    <span className="ms-2 text-xs text-neo-red">{t('admin.eduDashboard.teachers.lockedOut', 'Cannot sign in')}</span>
                  )}
                </td>
                <td className={`p-2 ${MUTED}`}>{shortDate(r.lastActiveAt, language)}</td>
                <td className="p-2 text-end">{r.classes}</td>
                <td className="p-2 text-end">{r.students}</td>
                <td className="p-2 text-end">{r.roundsLast7d ?? '—'}</td>
                <td className="p-2">{planLabel(r, t)}</td>
                <td className="p-2">
                  <HealthChip health={r.health} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className={`p-2 text-sm ${MUTED}`}>{t('admin.eduDashboard.drill.empty', 'Nobody here.')}</p>}
      </div>
      {!drill && filter === 'all' && dormant.length > 0 && !showDormant && (
        <button
          type="button"
          onClick={() => setShowDormant(true)}
          className={`text-xs font-semibold ${MUTED} underline-offset-2 hover:underline`}
        >
          {t('admin.eduDashboard.teachers.showDormant', 'Show dormant')}
          <span className="ms-1.5 tabular-nums">{dormant.length}</span>
        </button>
      )}
      <p className={`text-xs ${MUTED}`}>
        {t(
          'admin.eduDashboard.teachers.healthDefinition',
          'Thriving: visited and ran a class game in the last 7 days. At risk: visited in the last 21 days without that. Dormant: no visit in 21 days.',
        )}
      </p>
    </section>
  );
}

function planLabel(r: TeacherRow, t: (k: string, fb?: string) => string): string {
  if (r.paying) return t('admin.eduDashboard.teachers.planPaid', 'Paid Pro');
  if (r.trialExpiresAt && Date.parse(r.trialExpiresAt) > Date.now()) return t('admin.eduDashboard.teachers.planTrial', 'Trial');
  return t('admin.eduDashboard.teachers.planFree', 'Free');
}
