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
  /** The desktop rail's panel already names the pyramid. */
  showTitle?: boolean;
}

export default function PyramidHeader({ state, metaAnswer, className, testId, rankSlot, daily = false, showTitle = true }: PyramidHeaderProps) {
  const { t } = useLanguage();
  const left = pyramidAttemptsLeft(state);
  return (
    <header data-testid={testId} className={cn('flex shrink-0 flex-col gap-2 [@container(height<=36rem)]:gap-1', className)}>
      {showTitle &&
        (daily ? (
          // pe-10: the global in-game mute button floats over the inline-end corner.
          <DailyQuestHeading className="pe-10 [@container(height<=36rem)]:hidden" />
        ) : (
          <h1 className="text-center font-neo-display text-lg font-black text-neo-white">{t('connections.pyramid.title')}</h1>
        ))}
      {/* Taught once, on the first riddle; the finale card states its own goal. Short
          phones (inside the play screen's size container) drop it, then the rank. */}
      {state.stage === 0 && (
        <p data-testid="pyramid-explainer" className="text-center font-neo-body text-xs text-neo-white/60 [@container(max-height:46rem)]:hidden">
          {t('connections.pyramid.explainer')}
        </p>
      )}
      {rankSlot && (
        <div data-testid="pyramid-rank-slot" className="[@container(max-height:42rem)]:hidden">
          {rankSlot}
        </div>
      )}
      <PyramidProgress
        stage={state.stage}
        solvedBridges={state.solvedBridges}
        gaveUpBase={state.gaveUpBase}
        metaAnswer={metaAnswer}
        won={state.status === 'won'}
        // Tries left ride the sky's corner: the budget stays visible without a row of its own.
        corner={
          <div
            data-testid="pyramid-attempts"
            data-remaining={left}
            className="flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-navy/85 px-2 py-1 shadow-hard-sm"
            aria-label={t('connections.daily.triesLeft', { count: left })}
          >
            {left === 1 && (
              <span className="font-neo-body text-[0.7rem] font-bold uppercase tracking-wider text-neo-red rtl:tracking-normal">
                {t('connections.daily.lastTry')}
              </span>
            )}
            {Array.from({ length: PYRAMID_ATTEMPTS_PER_STAGE }, (_, i) => (
              <Heart
                key={i}
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-colors duration-200 ${i < left ? 'fill-neo-red text-neo-red' : 'text-neo-white/30'}`}
                strokeWidth={2.5}
              />
            ))}
          </div>
        }
      />
    </header>
  );
}
