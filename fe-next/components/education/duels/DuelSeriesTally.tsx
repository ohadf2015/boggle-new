'use client';

/**
 * DuelSeriesTally — the best-of-3 head-to-head strip on the reveal screen.
 *
 * Rematch used to be a flat button: play again, forget the last game. Three
 * pips turn two duels into a series, so losing game 1 is a reason to tap
 * REMATCH rather than a reason to leave.
 *
 * The pips read the running tally (lib/education/duelSeries.ts): wins first,
 * then losses, then draws, then the games still to play.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { DUEL_SERIES_MAX_GAMES, type DuelSeries, type DuelSeriesStatus } from '@/lib/education/duelSeries';
import { cn } from '@/lib/utils';

export interface DuelSeriesTallyProps {
  series: DuelSeries;
  status: DuelSeriesStatus;
  className?: string;
}

type PipResult = 'win' | 'loss' | 'draw' | 'pending';

function pipResults(series: DuelSeries): PipResult[] {
  const draws = Math.max(series.games - series.mine - series.theirs, 0);
  const played: PipResult[] = [
    ...Array<PipResult>(series.mine).fill('win'),
    ...Array<PipResult>(series.theirs).fill('loss'),
    ...Array<PipResult>(draws).fill('draw'),
  ].slice(0, DUEL_SERIES_MAX_GAMES);

  while (played.length < DUEL_SERIES_MAX_GAMES) played.push('pending');
  return played;
}

const PIP_CLASS: Record<PipResult, string> = {
  win: 'bg-neo-lime',
  loss: 'bg-neo-pink',
  draw: 'bg-neo-cyan',
  pending: 'bg-neo-navy',
};

export function DuelSeriesTally({ series, status, className }: DuelSeriesTallyProps) {
  const { t } = useLanguage();
  const pips = pipResults(series);

  const label =
    status === 'won'
      ? t('education.duels.seriesWon')
      : status === 'lost'
        ? t('education.duels.seriesLost')
        : status === 'tied'
          ? t('education.duels.seriesTied')
          : t('education.duels.seriesGameOf', undefined, {
              game: Math.min(series.games + 1, DUEL_SERIES_MAX_GAMES),
              total: DUEL_SERIES_MAX_GAMES,
            });

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <div className="flex items-center gap-1.5" role="list">
        {pips.map((result, index) => (
          <span
            key={`pip-${index}`}
            role="listitem"
            data-testid="duel-series-pip"
            data-result={result}
            className={cn(
              'h-3.5 w-8 rounded-neo border-2 border-neo-black shadow-hard-sm',
              PIP_CLASS[result]
            )}
          />
        ))}
      </div>
      <p
        data-testid="duel-series-label"
        className="font-neo-body text-[11px] font-black uppercase tracking-widest text-neo-cream/85"
      >
        {label}
      </p>
    </div>
  );
}
