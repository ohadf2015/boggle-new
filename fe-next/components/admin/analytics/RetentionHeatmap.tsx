'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CohortRow {
  cohort_week: string;
  week_offset: number;
  retained: number;
  cohort_size: number;
  retention_pct: number;
}

interface RetentionHeatmapProps {
  cohorts: CohortRow[] | null;
}

function getRetentionColor(pct: number): string {
  if (pct >= 50) return 'bg-emerald-500/80 text-white';
  if (pct >= 30) return 'bg-emerald-400/50 text-white';
  if (pct >= 20) return 'bg-yellow-400/40 text-white';
  if (pct >= 10) return 'bg-orange-400/30 text-white';
  return 'bg-red-400/20 text-slate-300';
}

function formatWeekDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RetentionHeatmap({ cohorts }: RetentionHeatmapProps) {
  const { t } = useLanguage();

  // Group rows by cohort_week
  const grouped = useMemo(() => {
    if (!cohorts) return null;
    const map = new Map<string, { size: number; offsets: Map<number, number> }>();

    for (const row of cohorts) {
      if (!map.has(row.cohort_week)) {
        map.set(row.cohort_week, { size: row.cohort_size, offsets: new Map() });
      }
      map.get(row.cohort_week)!.offsets.set(row.week_offset, row.retention_pct);
    }

    return map;
  }, [cohorts]);

  if (!grouped) {
    return (
      <div data-testid="retention-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 animate-pulse h-48" />
    );
  }

  // Find max week offset for column headers
  const maxOffset = cohorts ? Math.max(...cohorts.map(r => r.week_offset), 0) : 0;
  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6 overflow-x-auto">
      <h3 className="text-sm font-neo-display text-neo-white mb-3">
        {t('admin.analytics.retentionTitle')}
      </h3>

      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-start text-slate-400 pb-2 pe-3 whitespace-nowrap">{t('admin.analytics.cohort')}</th>
            <th className="text-center text-slate-400 pb-2 px-1">{t('admin.analytics.size')}</th>
            {offsets.map(o => (
              <th key={o} className="text-center text-slate-400 pb-2 px-1 min-w-[44px]">
                W{o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(grouped.entries()).map(([week, data]) => (
            <tr key={week}>
              <td className="text-slate-300 py-1 pe-3 whitespace-nowrap font-medium">
                {formatWeekDate(week)}
              </td>
              <td className="text-center text-slate-400 py-1 px-1">
                {data.size}
              </td>
              {offsets.map(o => {
                const pct = data.offsets.get(o);
                if (pct === undefined) {
                  return <td key={o} className="py-1 px-1" />;
                }
                return (
                  <td key={o} className="py-1 px-1">
                    <div className={cn(
                      'rounded px-1 py-0.5 text-center font-medium',
                      o === 0 ? 'bg-slate-600/50 text-slate-300' : getRetentionColor(pct)
                    )}>
                      {o === 0 ? '—' : `${Math.round(pct)}%`}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
