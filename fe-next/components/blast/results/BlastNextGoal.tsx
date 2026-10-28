'use client';

import { Crosshair, Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { BlastResultsView } from './blastResultsViewModel';
import type { BlastTranslate } from './types';

interface BlastNextGoalProps {
  view: BlastResultsView;
  t: BlastTranslate;
  locale: string;
}

export function BlastNextGoal({ view, t, locale }: BlastNextGoalProps) {
  const goal = view.nextGoal;
  if (!goal) return null;

  const gap = safeToLocaleString(goal.gap, locale);
  const text =
    goal.kind === 'rival'
      ? t('blast.results.reveal.goalRival', { gap, name: goal.name })
      : goal.kind === 'lead'
        ? t('blast.results.reveal.goalLead', { gap, name: goal.name })
        : t('blast.results.reveal.goalBest', { gap });
  const Icon = goal.kind === 'lead' ? Trophy : goal.kind === 'rival' ? Swords : Crosshair;
  const progress = goal.kind === 'lead' ? 100 : Math.max(4, Math.round((view.score / (view.score + goal.gap)) * 100));

  return (
    <div
      data-reveal="goal"
      data-testid="blast-results-next-goal"
      data-kind={goal.kind}
      className={cn(
        'w-full rounded-neo border-3 border-neo-black px-3 py-2.5 shadow-hard',
        view.nearMiss ? 'bg-neo-pink text-neo-black' : 'bg-neo-navy-light text-neo-white',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
        <p className="flex-1 text-sm font-black" dir="auto">
          {text}
        </p>
        {view.nearMiss && (
          <span
            data-testid="blast-results-near-miss"
            className="shrink-0 -rotate-3 rounded-neo border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-neo-black"
          >
            {t('blast.results.reveal.nearMiss')}
          </span>
        )}
      </div>
      {goal.kind !== 'lead' && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy">
          <div
            className={cn('h-full origin-left rtl:origin-right', view.nearMiss ? 'bg-neo-yellow' : 'bg-neo-lime')}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
