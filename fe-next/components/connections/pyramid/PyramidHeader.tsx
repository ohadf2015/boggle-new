'use client';

import type { ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { pyramidAttemptsLeft, PYRAMID_ATTEMPTS_PER_STAGE, type PyramidState } from '@/lib/connections/pyramid/gameLogic';
import PyramidProgress from './PyramidProgress';
import DailyQuestHeading from '../DailyQuestHeading';

interface PyramidHeaderProps {
  state: PyramidState;
  metaAnswer: string;
  className?: string;
  testId?: string;
  /** Lifetime rank badge, shown above the tries on the standalone (non-shell) layout. */
  rankSlot?: ReactNode;
  /** Hosted as the day's daily quest: title it the way the daily flow does. */
  daily?: boolean;
}

export default function PyramidHeader({ state, metaAnswer, className, testId, rankSlot, daily = false }: PyramidHeaderProps) {
  const { t } = useLanguage();
  const left = pyramidAttemptsLeft(state);
  return (
    <header data-testid={testId} className={cn('flex flex-col gap-2', className)}>
      {daily ? (
        <DailyQuestHeading className="justify-center" />
      ) : (
        <h1 className="text-center font-neo-display text-lg font-black text-neo-white">
          {t('connections.pyramid.title')}
        </h1>
      )}
      <p className="text-center font-neo-body text-xs text-neo-white/60">
        {state.stage < 3 ? t('connections.pyramid.explainer') : t('connections.pyramid.finalePrompt')}
      </p>
      {rankSlot}
      {/* Attempts were spent invisibly — the player only learned a budget existed when the run ended. */}
      <div
        data-testid="pyramid-attempts"
        data-remaining={left}
        className="flex items-center justify-center gap-1.5"
        aria-label={t('connections.daily.triesLeft', { count: left })}
      >
        {left === 1 && (
          <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-wider text-neo-red">
            {t('connections.daily.lastTry')}
          </span>
        )}
        {Array.from({ length: PYRAMID_ATTEMPTS_PER_STAGE }, (_, i) => (
          <Heart
            key={i}
            aria-hidden="true"
            className={`h-4 w-4 transition-colors duration-200 ${i < left ? 'fill-neo-red text-neo-red' : 'text-neo-white/30'}`}
            strokeWidth={2.5}
          />
        ))}
      </div>
      <PyramidProgress
        stage={state.stage}
        solvedBridges={state.solvedBridges}
        gaveUpBase={state.gaveUpBase}
        metaAnswer={metaAnswer}
        won={state.status === 'won'}
      />
    </header>
  );
}
