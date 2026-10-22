'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { SparkKey } from '@/lib/admin/eduDashboard';
import { deltaSentence, PANEL, MUTED, useEntered, type ActiveDrill, type EduDashboardView } from './eduDashboardShared';
import { useCountUp } from './useCountUp';

const KPI_ORDER: SparkKey[] = [
  'activeTeachers',
  'newTeachers',
  'classesWithLiveGame',
  'liveRounds',
  'trialsStarted',
  'trialsPaid',
];

const LABEL_FALLBACK: Record<SparkKey, string> = {
  activeTeachers: 'Teachers who visited',
  newTeachers: 'Newly approved teachers',
  classesWithLiveGame: 'Classes that played',
  liveRounds: 'Class games played',
  trialsStarted: 'Pro trials started',
  trialsPaid: 'Trials that paid',
};

const DEFINITION_FALLBACK: Record<SparkKey, string> = {
  activeTeachers: 'Teachers whose last visit falls in this period. Only the last visit is stored, so there is no earlier comparison.',
  newTeachers: 'Access requests approved in this period, one per person.',
  classesWithLiveGame: 'Classes that finished at least one live game in this period.',
  liveRounds: 'Live classroom games finished in this period.',
  trialsStarted: 'Approved teachers whose Pro trial began in this period.',
  trialsPaid: 'Trial teachers who started a paid Pro plan in this period. Free and gifted Pro are not counted.',
};

const NO_PRIOR: ReadonlySet<SparkKey> = new Set(['activeTeachers']);

export function EduKpiGrid({ data, onDrill }: { data: EduDashboardView; onDrill: (drill: ActiveDrill) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {KPI_ORDER.map((key) => {
        const delta = data.kpis[key];
        const target = data.drill.kpi[key];
        const label = t(`admin.eduDashboard.kpi.${key}`, LABEL_FALLBACK[key]);
        return (
          <KpiTile
            key={key}
            testId={`kpi-${key}`}
            label={label}
            definition={t(`admin.eduDashboard.kpiDefinition.${key}`, DEFINITION_FALLBACK[key])}
            value={delta ? delta.current : null}
            deltaText={delta && !NO_PRIOR.has(key) ? deltaSentence(delta, data.windowDays, t) : null}
            noData={t('admin.eduDashboard.notMeasured', 'Not measured yet: the class games table is missing in this database.')}
            spark={data.sparklines[key]}
            drillLabel={
              target && target.ids.length > 0
                ? t('admin.eduDashboard.drill.show', 'Show the list ({count})', { count: target.ids.length })
                : null
            }
            onDrill={target ? () => onDrill({ ...target, title: label }) : undefined}
          />
        );
      })}
    </div>
  );
}

function KpiTile({
  testId,
  label,
  definition,
  value,
  deltaText,
  noData,
  spark,
  drillLabel,
  onDrill,
}: {
  testId: string;
  label: string;
  definition: string;
  value: number | null;
  deltaText: string | null;
  noData: string;
  spark: number[] | null;
  drillLabel: string | null;
  onDrill?: () => void;
}) {
  const shown = useCountUp(value ?? 0);
  return (
    <div data-testid={testId} className={`${PANEL} flex flex-col gap-1`}>
      <p className="text-sm font-semibold text-neo-cream">{label}</p>
      {value === null ? (
        <p className={`text-sm ${MUTED}`}>{noData}</p>
      ) : (
        <>
          <p className="text-3xl font-bold tabular-nums text-neo-white">{shown}</p>
          {deltaText && <p data-testid={`${testId}-delta`} className={`text-xs tabular-nums ${MUTED}`}>{deltaText}</p>}
        </>
      )}
      <p className={`text-xs ${MUTED}`}>{definition}</p>
      {spark && <Sparkline values={spark} />}
      {drillLabel && onDrill && (
        <button
          type="button"
          onClick={onDrill}
          className="mt-auto self-start text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neo-cyan"
        >
          {drillLabel}
        </button>
      )}
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
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-6 w-full" aria-hidden="true">
      <polyline
        points={points}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={1}
        strokeDashoffset={entered ? 0 : 1}
        className="text-neo-cyan transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}
