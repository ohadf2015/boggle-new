'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PeriodDelta } from '@/lib/admin/eduMetrics';
import { formatDelta, useEntered, type EduDashboardView } from './eduDashboardShared';
import { useCountUp } from './useCountUp';

interface Tile {
  key: keyof EduDashboardView['kpis'];
  label: string;
  delta: PeriodDelta | null;
  spark: number[] | null;
  unmeasured: boolean;
}

export function EduKpiGrid({ data }: { data: EduDashboardView }) {
  const { t } = useLanguage();
  const k = data.kpis;
  const s = data.sparklines;
  const roundsTile = (key: keyof EduDashboardView['kpis']) =>
    (key === 'classesWithLiveGame' || key === 'liveRounds') && !data.roundsAvailable;
  const tile = (key: keyof EduDashboardView['kpis'], label: string): Tile => ({
    key,
    label,
    delta: k[key],
    spark: s[key],
    unmeasured: roundsTile(key),
  });
  const tiles: Tile[] = [
    tile('activeTeachers', t('admin.eduDashboard.kpi.activeTeachers', 'Active teachers')),
    tile('newTeachers', t('admin.eduDashboard.kpi.newTeachers', 'New teachers')),
    tile('trialsStarted', t('admin.eduDashboard.kpi.trialsStarted', 'Pro trials started')),
    tile('trialsPaid', t('admin.eduDashboard.kpi.trialsPaid', 'Trials converted to paid')),
    tile('classesWithLiveGame', t('admin.eduDashboard.kpi.classesWithLiveGame', 'Classes with a live game')),
    tile('liveRounds', t('admin.eduDashboard.kpi.liveRounds', 'Live rounds played')),
  ];
  const isQuiet = (x: Tile) => x.unmeasured || !x.delta || (x.delta.current === 0 && x.delta.prior === 0);
  const active = tiles.filter((x) => !isQuiet(x));
  const quiet = tiles.filter(isQuiet);
  const noData = t('admin.eduDashboard.noData', 'No data yet');

  const renderTile = (x: Tile) => (
    <KpiTile
      key={x.key}
      testId={`kpi-${x.key}`}
      label={x.label}
      value={x.unmeasured || !x.delta ? null : x.delta.current}
      delta={formatDelta(x.delta)}
      noData={noData}
      spark={x.unmeasured ? null : x.spark}
    />
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{active.map(renderTile)}</div>
      {quiet.length > 0 && (
        <details data-testid="quiet-metrics" className="rounded border border-white/10 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-white/60">
            {t('admin.eduDashboard.quiet', 'Quiet metrics')} ({quiet.length})
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">{quiet.map(renderTile)}</div>
        </details>
      )}
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
        <div className="flex items-end justify-between gap-2">
          <p className="mt-1 text-2xl font-bold tabular-nums">{shown}</p>
          <p className="text-xs tabular-nums text-white/60">{delta ?? '—'}</p>
        </div>
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
