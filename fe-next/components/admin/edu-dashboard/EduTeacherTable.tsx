'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherDetailPath } from '@/components/admin/education/AdminTeacherDetail';
import type { TeacherRow } from '@/lib/admin/eduDashboard';
import type { TeacherHealth } from '@/lib/admin/eduMetrics';
import { HealthChip, healthLabel, shortDate } from './eduDashboardShared';

type Filter = 'all' | TeacherHealth;

export function EduTeacherTable({ rows }: { rows: TeacherRow[] }) {
  const { t, language } = useLanguage();
  const [filter, setFilter] = useState<Filter>('all');
  const [showDormant, setShowDormant] = useState(false);

  const thriving = rows.filter((r) => r.health === 'thriving');
  const atRisk = rows.filter((r) => r.health === 'at_risk').sort((a, b) => b.students - a.students);
  const dormant = rows.filter((r) => r.health === 'dormant');

  const visible =
    filter === 'thriving'
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
    <details className="rounded border border-white/15">
      <summary className="cursor-pointer p-3 text-sm font-semibold">
        {t('admin.eduDashboard.teachers.all', 'All teachers')}
        <span className="ml-2 tabular-nums text-white/60">{rows.length}</span>
      </summary>
      <div className="space-y-3 p-3">
        <div role="group" aria-label={t('admin.eduDashboard.teachers.filterLabel', 'Filter by health')} className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                filter === c.key ? 'border-white bg-white text-black' : 'border-white/30 text-white/80'
              }`}
            >
              {c.label}
              <span className="ml-1.5 tabular-nums">{c.count}</span>
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-white/60">
              <tr>
                <th className="p-2">{t('admin.eduDashboard.teachers.name', 'Teacher')}</th>
                <th className="p-2">{t('admin.eduDashboard.teachers.lastActive', 'Last active')}</th>
                <th className="p-2 text-right">{t('admin.eduDashboard.teachers.classes', 'Classes')}</th>
                <th className="p-2 text-right">{t('admin.eduDashboard.teachers.students', 'Students')}</th>
                <th className="p-2 text-right">{t('admin.eduDashboard.teachers.rounds7d', 'Rounds 7d')}</th>
                <th className="p-2">{t('admin.eduDashboard.teachers.health', 'Health')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <td className="p-2">
                    <Link href={teacherDetailPath(language, r.id)} className="font-semibold hover:underline">
                      {r.name ?? '—'}
                    </Link>
                  </td>
                  <td className="p-2 text-white/70">{shortDate(r.lastActiveAt, language)}</td>
                  <td className="p-2 text-right">{r.classes}</td>
                  <td className="p-2 text-right">{r.students}</td>
                  <td className="p-2 text-right">{r.roundsLast7d ?? '—'}</td>
                  <td className="p-2">
                    <HealthChip health={r.health} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filter === 'all' && dormant.length > 0 && !showDormant && (
          <button
            type="button"
            onClick={() => setShowDormant(true)}
            className="text-xs font-semibold text-white/70 underline-offset-2 hover:underline"
          >
            {t('admin.eduDashboard.teachers.showDormant', 'Show dormant')}
            <span className="ml-1.5 tabular-nums">{dormant.length}</span>
          </button>
        )}
      </div>
    </details>
  );
}
