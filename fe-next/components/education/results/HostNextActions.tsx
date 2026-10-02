'use client';

import Link from 'next/link';
import { Flame, RotateCcw } from 'lucide-react';
import { SchoolGlyph, ShuffleGlyph } from './resultsGlyphs';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { tr } from '@/components/education/lobby/eduText';
import { trackResultsAction } from './trackResultsAction';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface HostNextActionsProps {
  language: string;
  t: Translate;
  onRematch?: () => void;
  /** Hands the room back to the lobby, where the mode switcher lives. */
  onChangeGame?: () => void;
  /** The host's own exit path (confirm + clean room close). Falls back to a link. */
  onBackToClass?: () => void;
  /** The wall's shared "More" reteach disclosure, mounted by the caller. */
  reteachSlot?: ReactNode;
  /** The quiet Pro report / unlock ask, mounted by the caller; always last. */
  followUpSlot?: ReactNode;
  roundNumber: number;
  sweepStreak: number;
}

const PILL = cn(
  'inline-flex min-h-11 items-center gap-2 rounded-neo px-3 py-2 lg:px-4',
  'border-[3px] border-neo-cream bg-neo-navy-elevated text-neo-cream shadow-hard-sm',
  'font-neo-display text-sm font-black uppercase tracking-wide lg:text-lg min-[2200px]:px-6 min-[2200px]:py-3 min-[2200px]:text-3xl',
  'transition-transform hover:-translate-y-0.5 hover:bg-neo-navy-light active:translate-y-0.5 active:shadow-none',
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan'
);

export function HostNextActions({
  language,
  t,
  onRematch,
  onChangeGame,
  onBackToClass,
  reteachSlot,
  followUpSlot,
  roundNumber,
  sweepStreak,
}: HostNextActionsProps) {
  const backLabel = t('eduLive.results.backToClass');
  const backIcon = <SchoolGlyph className="size-5 shrink-0 lg:size-6" />;

  return (
    // On a phone the recap is one column: the next step comes right after the winner, above the word lists.
    <div data-testid="host-next-actions" className="shrink-0 flex flex-col gap-2 max-lg:order-first">
      {onRematch && (
        <button
          type="button"
          data-testid="classroom-tv-rematch"
          onClick={() => {
            trackResultsAction('rematch', 'projector');
            onRematch();
          }}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-4 py-3 md:px-6 md:py-4 min-[2200px]:gap-6 min-[2200px]:py-7',
            'font-neo-display font-black text-2xl md:text-4xl min-[2200px]:text-7xl',
            'bg-neo-lime text-neo-black border-4 border-neo-black rounded-neo-lg',
            'shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-0.5 active:translate-y-0.5 transition-all'
          )}
        >
          <RotateCcw className="w-8 h-8 shrink-0 min-[2200px]:w-14 min-[2200px]:h-14" aria-hidden />
          <span className="flex flex-col items-start leading-none">
            <span className="uppercase">{tr(t, 'academy.results.playAgain', 'Play again')}</span>
            <span className="mt-1 font-neo-body text-sm font-bold normal-case md:text-base min-[2200px]:mt-3 min-[2200px]:text-3xl">
              {tr(t, 'academy.results.playAgainHint', 'Same words, same code. Nobody rejoins.')}
            </span>
          </span>
        </button>
      )}

      <div
        data-testid="tv-secondary-row"
        className="relative flex flex-wrap items-center justify-center gap-2 lg:gap-3"
      >
        {onChangeGame && (
          <button type="button" data-testid="classroom-tv-dismiss" onClick={onChangeGame} className={PILL}>
            <ShuffleGlyph className="size-5 shrink-0 lg:size-6" />
            {t('eduLive.results.switchGame')}
          </button>
        )}

        {onBackToClass ? (
          <button type="button" data-testid="classroom-tv-back-to-class" onClick={onBackToClass} className={PILL}>
            {backIcon}
            {backLabel}
          </button>
        ) : (
          <Link href={`/${language}/teacher`} data-testid="classroom-tv-back-to-class" className={PILL}>
            {backIcon}
            {backLabel}
          </Link>
        )}

        {reteachSlot}

        {roundNumber > 1 && (
          <span
            data-testid="classroom-tv-round"
            className="px-3 py-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy text-neo-cream font-neo-display font-bold text-sm lg:px-4 lg:py-2 lg:text-xl min-[2200px]:px-6 min-[2200px]:py-3 min-[2200px]:text-3xl shadow-hard-sm"
          >
            {t('education.results.moment.roundOfSession', { round: roundNumber })}
          </span>
        )}
        {sweepStreak > 1 && (
          <span
            data-testid="classroom-tv-sweep-streak"
            className="flex items-center gap-2 px-3 py-1.5 rounded-neo border-[2px] border-neo-black bg-neo-orange text-neo-black font-neo-display font-black text-sm lg:px-4 lg:py-2 lg:text-xl min-[2200px]:px-6 min-[2200px]:py-3 min-[2200px]:text-3xl shadow-hard-sm"
          >
            <Flame className="w-5 h-5 shrink-0 lg:w-6 lg:h-6" aria-hidden />
            {t('education.results.moment.sweepStreak', { count: sweepStreak })}
          </span>
        )}

        {followUpSlot}
      </div>
    </div>
  );
}

export default HostNextActions;
