'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PeriodDelta } from '@/lib/admin/eduMetrics';
import { formatDelta, useEntered, type EduDashboardView } from './eduDashboardShared';
import { useCountUp } from './useCountUp';

export function EduKpiGrid({ data }: { data: EduDashboardView }) {
  const { t } = useLanguage();
  const k = data.kpis;
  const tiles: Array<{ key: string; label: string; delta: PeriodDelta | null; spark: number[] | null }> = [
    { key: 'activeTeachers', label: t('admin.eduDashboard.kpi.activeTeachers', 'Active teachers'), delta: k.activeTeachers, spark: data.sparklines.activeTeachers },
    { key: 'newTeachers', label: t('admin.eduDashboard.kpi.newTeachers', 'New teachers'), delta: k.newTeachers, spark: null },
    { key: 'classesWithLiveGame', label: t('admin.eduDashboard.kpi.classesWithLiveGame', 'Classes with a live game'), delta: k.classesWithLiveGame, spark: null },
    { key: 'liveRounds', label: t('admin.eduDashboard.kpi.liveRounds', 'Live rounds played'), delta: k.liveRounds, spark: data.sparklines.liveRounds },
    { key: 'trialsStarted', label: t('admin.eduDashboard.kpi.trialsStarted', 'Pro trials started'), delta: k.trialsStarted, spark: null },
    { key: 'trialsPaid', label: t('admin.eduDashboard.kpi.trialsPaid', 'Trials converted to paid'), delta: k.trialsPaid, spark: null },
  ];
  const noData = t('admin.eduDashboard.noData', 'No data yet');

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => {
        const roundsTile = tile.key === 'classesWithLiveGame' || tile.key === 'liveRounds';
        const missing = roundsTile && !data.roundsAvailable;
        const delta = formatDelta(tile.delta);
        return (
          <KpiTile
            key={tile.key}
            testId={`kpi-${tile.key}`}
            label={tile.label}
            value={missing || !tile.delta ? null : tile.delta.current}
            delta={delta}
            noData={noData}
            spark={missing ? null : tile.spark}
          />
        );
      })}
    </div>
  );
}

function KpiTile({
  testId,
  label,
  value,
  delta,
  noData,
  spark,
}: {
  testId: string;
  label: string;
  value: number | null;
  delta: string | null;
  noData: string;
  spark: number[] | null;
}) {
  const shown = useCountUp(value ?? 0);
  return (
    <div data-testid={testId} className="rounded border border-white/15 bg-white/5 p-3">
      <p className="text-xs text-white/60">{label}</p>
      {value === null ? (
        <p className="mt-1 text-sm text-white/50">{noData}</p>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold tabular-nums">{shown}</p>
          <p className="text-xs tabular-nums text-white/60">{delta ?? '—'}</p>
        </>
      )}
      {spark && <Sparkline values={spark} />}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const entered = useEntered();
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${30 - (v / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-6 w-full" aria-hidden="true">
      <polyline
        points={points}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={1}
        strokeDashoffset={entered ? 0 : 1}
        className="text-cyan-300 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}
