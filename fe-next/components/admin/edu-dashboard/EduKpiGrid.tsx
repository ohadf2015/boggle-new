'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { SparkKey } from '@/lib/admin/eduDashboard';
import { TrendTile } from '../shared/TrendTile';
import { deltaSentence, type ActiveDrill, type EduDashboardView } from './eduDashboardShared';

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

export function EduKpiGrid({
  data,
  onDrill,
  only,
}: {
  data: EduDashboardView;
  onDrill: (drill: ActiveDrill) => void;
  /** Render just these tiles (the Pro tab reuses the trial ones). */
  only?: SparkKey[];
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {KPI_ORDER.filter((k) => !only || only.includes(k)).map((key) => {
        const delta = data.kpis[key];
        const target = data.drill.kpi[key];
        const label = t(`admin.eduDashboard.kpi.${key}`, LABEL_FALLBACK[key]);
        return (
          <TrendTile
            key={key}
            testId={`kpi-${key}`}
            label={label}
            definition={t(`admin.eduDashboard.kpiDefinition.${key}`, DEFINITION_FALLBACK[key])}
            value={delta ? delta.current : null}
            deltaText={delta && !NO_PRIOR.has(key) ? deltaSentence(delta, data.windowDays, t) : null}
            noData={t('admin.eduDashboard.notMeasured', 'Not measured yet: the class games table is missing in this database.')}
            spark={data.sparklines[key]}
            action={
              target && target.ids.length > 0
                ? {
                    label: t('admin.eduDashboard.drill.show', 'Show the list ({count})', { count: target.ids.length }),
                    onClick: () => onDrill({ ...target, title: label }),
                  }
                : null
            }
          />
        );
      })}
    </div>
  );
}
