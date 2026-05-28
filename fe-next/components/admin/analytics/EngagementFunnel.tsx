'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface FunnelData {
  registered: number;
  playedFirstGame: number;
  returnedDay7: number;
  returnedDay30: number;
}

interface EngagementFunnelProps {
  funnel: FunnelData | null;
}

function conversionRate(from: number, to: number): string {
  if (from === 0) return '0.0%';
  return `${((to / from) * 100).toFixed(1)}%`;
}

const STEP_COLORS = [
  'bg-neo-cyan/20 border-neo-cyan/30',
  'bg-neo-lime/20 border-neo-lime/30',
  'bg-neo-orange/20 border-neo-orange/30',
  'bg-neo-pink/20 border-neo-pink/30',
];

export function EngagementFunnel({ funnel }: EngagementFunnelProps) {
  const { t } = useLanguage();

  if (!funnel) {
    return (
      <div data-testid="funnel-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 animate-pulse h-48" />
    );
  }

  const steps = [
    { label: t('admin.analytics.funnelRegistered'), value: funnel.registered, conversion: null as string | null },
    { label: t('admin.analytics.funnelFirstGame'), value: funnel.playedFirstGame, conversion: conversionRate(funnel.registered, funnel.playedFirstGame) },
    { label: t('admin.analytics.funnelDay7'), value: funnel.returnedDay7, conversion: conversionRate(funnel.playedFirstGame, funnel.returnedDay7) },
    { label: t('admin.analytics.funnelDay30'), value: funnel.returnedDay30, conversion: conversionRate(funnel.returnedDay7, funnel.returnedDay30) },
  ];

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white mb-3">
        {t('admin.analytics.funnelTitle')}
      </h3>

      <div className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const widthPct = funnel.registered > 0
            ? Math.max((step.value / funnel.registered) * 100, 8)
            : 100;

          return (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-neo border py-2 px-3 flex items-center justify-between transition-all',
                  STEP_COLORS[i]
                )}
                style={{ width: `${widthPct}%`, minWidth: 120 }}
              >
                <span className="text-xs text-slate-300 truncate">{step.label}</span>
                <span className="text-sm font-bold text-neo-white ms-2">{step.value}</span>
              </div>
              {step.conversion && (
                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  parseFloat(step.conversion) < 30 ? 'text-red-400' : 'text-slate-400'
                )}>
                  {step.conversion}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
