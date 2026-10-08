'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { FunnelStep } from '@/lib/admin/eduMetrics';
import { FUNNEL_LABEL_FALLBACK, useEntered } from './eduDashboardShared';

export function EduFunnelCard({ steps }: { steps: FunnelStep[] }) {
  const { t } = useLanguage();
  const entered = useEntered();
  const top = Math.max(1, steps[0]?.count ?? 0);

  return (
    <div className="rounded border border-white/15 p-3">
      <h3 className="mb-2 text-sm font-semibold">{t('admin.eduDashboard.funnel.title', 'Teacher funnel')}</h3>
      <ol className="space-y-2 text-sm">
        {steps.map((step, i) => {
          const prev = i === 0 ? null : steps[i - 1].count;
          const loss = prev === null ? 0 : prev - step.count;
          const label = t(`admin.eduDashboard.funnel.${step.key}`, FUNNEL_LABEL_FALLBACK[step.key] ?? step.key);
          return (
            <li
              key={step.key}
              data-testid={`funnel-step-${step.key}`}
              data-drop={step.isBiggestDrop ? 'true' : 'false'}
              className={`rounded px-2 py-1 ${step.isBiggestDrop ? 'bg-red-500/15 text-red-100' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span>{label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  {step.isBiggestDrop && loss > 0 && (
                    <span data-testid={`funnel-loss-${step.key}`} className="font-bold text-red-300">
                      {`−${loss}`}
                    </span>
                  )}
                  <span className="font-semibold">{step.count}</span>
                  {step.pctOfPrev !== null && <span className="text-xs text-white/60">{`${step.pctOfPrev}%`}</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                    step.isBiggestDrop ? 'bg-red-400' : 'bg-cyan-300'
                  }`}
                  style={{ width: entered ? `${Math.round((step.count / top) * 100)}%` : '0%' }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
