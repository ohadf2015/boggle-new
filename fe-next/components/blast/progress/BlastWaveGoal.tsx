'use client';

import { Crosshair, Trophy, Swords, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildWaveGoal, type WaveGoalInput } from './waveGoal';

/** The chase between waves: players this wave passed, where the run ranks this week, and who is next. */
export function BlastWaveGoal(props: WaveGoalInput) {
  const { t } = useLanguage();
  const goal = buildWaveGoal(props);
  const { target, justPassed } = goal;
  if (!target && justPassed.length === 0 && goal.ahead == null) return null;

  const TargetIcon = target?.kind === 'top' ? Trophy : target?.kind === 'rival' ? Swords : Crosshair;
  const targetText =
    target?.kind === 'rival'
      ? t('blastProgress.goalRival', { gap: target.gap.toLocaleString(), name: target.name })
      : target?.kind === 'best'
        ? t('blastProgress.goalBest', { gap: target.gap.toLocaleString() })
        : t('blastProgress.goalTop');

  return (
    <section
      data-clear="goal"
      data-testid="blast-clear-goal"
      className="w-full max-w-sm rounded-neo border-3 border-neo-black bg-neo-navy-light px-3 py-2.5 shadow-hard tv:max-w-2xl tv:px-6 tv:py-4"
    >
      {justPassed.length > 0 && (
        <p data-testid="blast-clear-passed" className="mb-2 rounded-md border-2 border-neo-black bg-neo-lime px-2 py-1 text-center font-neo-display text-sm font-black uppercase text-neo-black tv:text-xl" dir="auto">
          {justPassed.length === 1
            ? t('blastProgress.passedOne', { name: justPassed[0].name })
            : t('blastProgress.passedMany', { n: justPassed.length, name: justPassed[0].name })}
        </p>
      )}
      {goal.ahead != null && goal.rank != null && goal.total != null && (
        <p data-testid="blast-clear-standing" className="flex items-center justify-center gap-1.5 font-neo-display text-xs font-black uppercase tracking-wide text-neo-white tv:text-lg" dir="auto">
          <Users className="h-4 w-4 shrink-0 text-neo-cyan tv:h-6 tv:w-6" strokeWidth={2.75} aria-hidden="true" />
          {t('blastProgress.standing', { rank: goal.rank, total: goal.total, ahead: goal.ahead })}
        </p>
      )}
      {target && (
        <div className="mt-2" data-testid="blast-clear-target" data-kind={target.kind}>
          <div className="flex items-center justify-center gap-1.5 text-neo-white">
            <TargetIcon className="h-4 w-4 shrink-0 text-neo-yellow tv:h-6 tv:w-6" strokeWidth={2.75} aria-hidden="true" />
            <p className="text-sm font-black tv:text-xl" dir="auto">{targetText}</p>
          </div>
          {target.kind !== 'top' && (
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy">
              <div className="h-full origin-left bg-neo-yellow rtl:origin-right" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
