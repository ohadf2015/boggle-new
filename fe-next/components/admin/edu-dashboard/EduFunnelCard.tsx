'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EduDrill, FunnelKey } from '@/lib/admin/eduDashboard';
import type { FunnelStep } from '@/lib/admin/eduMetrics';
import { FUNNEL_LABEL_FALLBACK, PANEL, MUTED, teacherAccessPath, useEntered, type ActiveDrill } from './eduDashboardShared';

const DEFINITION_FALLBACK: Record<string, string> = {
  requested: 'People who filled in the teacher access form, all time.',
  approved: 'Applicants an admin approved.',
  signin: 'Approved and given the teacher role, so /teacher lets them in.',
  classroom: 'Created at least one class.',
  student: 'At least one student joined one of their classes.',
};

export function EduFunnelCard({
  steps,
  drill,
  onDrill,
}: {
  steps: FunnelStep[];
  drill: EduDrill['funnel'];
  onDrill: (drill: ActiveDrill) => void;
}) {
  const { t, language } = useLanguage();
  const entered = useEntered();
  const top = Math.max(1, steps[0]?.count ?? 0);

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold text-neo-cream">{t('admin.eduDashboard.funnel.title', 'Teacher journey')}</h3>
      <p className={`mb-2 text-xs ${MUTED}`}>
        {t('admin.eduDashboard.funnel.hint', 'All time. % is the share of the step above. Click a step to see who stopped there.')}
      </p>
      <ol className="space-y-1 text-sm">
        {steps.map((step, i) => {
          const prev = i === 0 ? null : steps[i - 1].count;
          const loss = prev === null ? 0 : prev - step.count;
          const label = t(`admin.eduDashboard.funnel.${step.key}`, FUNNEL_LABEL_FALLBACK[step.key] ?? step.key);
          const stuckIds = drill[step.key as FunnelKey] ?? [];
          const body = (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  {step.isBiggestDrop && loss > 0 && (
                    <span data-testid={`funnel-loss-${step.key}`} className="font-bold text-neo-red">
                      {`−${loss}`}
                    </span>
                  )}
                  <span className="font-bold text-neo-white">{step.count}</span>
                  {step.pctOfPrev !== null && <span className={`text-xs ${MUTED}`}>{`${step.pctOfPrev}%`}</span>}
                </span>
              </div>
              <p className={`text-xs ${MUTED}`}>{t(`admin.eduDashboard.funnelDefinition.${step.key}`, DEFINITION_FALLBACK[step.key] ?? '')}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neo-cream/10">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                    step.isBiggestDrop ? 'bg-neo-red' : 'bg-neo-cyan'
                  }`}
                  style={{ width: entered ? `${Math.round((step.count / top) * 100)}%` : '0%' }}
                />
              </div>
            </>
          );
          const rowClass = `block w-full rounded px-2 py-1 text-start text-neo-cream hover:bg-neo-cream/10 focus-visible:outline-2 focus-visible:outline-neo-cyan ${
            step.isBiggestDrop ? 'bg-neo-red/15' : ''
          }`;
          const common = { 'data-testid': `funnel-step-${step.key}`, 'data-drop': step.isBiggestDrop ? 'true' : 'false' };
          return (
            <li key={step.key}>
              {step.key === 'requested' ? (
                <Link href={teacherAccessPath(language)} className={rowClass} {...common}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={rowClass}
                  {...common}
                  onClick={() =>
                    onDrill({
                      kind: 'teachers',
                      ids: stuckIds,
                      title: t('admin.eduDashboard.drill.stoppedAt', 'Stopped at: {step}', { step: label }),
                    })
                  }
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
