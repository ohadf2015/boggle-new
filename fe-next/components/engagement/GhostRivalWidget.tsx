'use client';

/**
 * GhostRivalWidget - Persistent landing page widget showing weekly rivalry.
 *
 * Displays rival avatar/name/score, player score, point gap,
 * weekly countdown, and a CTA to play.
 * Neo-brutalist: border-neo, shadow-hard, compact card.
 */

import React, { memo, useMemo } from 'react';
import { Swords, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGhostRival } from '@/hooks/useGhostRival';
import { cn } from '@/lib/utils';

function useCountdown(weekEnd: string | null): string {
  const { t } = useLanguage();

  return useMemo(() => {
    if (!weekEnd) return '';
    const end = new Date(weekEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return t('ghostRival.ended');

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const time = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    return t('ghostRival.endsIn', { time });
  }, [weekEnd, t]);
}

export const GhostRivalWidget: React.FC = memo(() => {
  const { t } = useLanguage();
  const { rival, player, gap, isAhead, loading, weekEnd } = useGhostRival();
  const countdown = useCountdown(weekEnd);

  if (loading || !rival) return null;

  const gapText = isAhead
    ? t('ghostRival.ahead', { pts: String(gap) })
    : t('ghostRival.behind', { pts: String(gap) });

  return (
    <div
      data-testid="ghost-rival-widget"
      className={cn(
        'border-neo rounded-neo p-3 sm:p-4',
        'bg-neo-navy-dark/90 shadow-hard-sm',
        'flex flex-col gap-2',
      )}
      role="region"
      aria-label={t('ghostRival.title')}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Swords className="w-5 h-5 text-neo-pink" />
        <span className="font-neo-display font-bold text-neo-white text-sm sm:text-base">
          {t('ghostRival.title')}
        </span>
      </div>

      {/* Score comparison */}
      <div className="flex items-center justify-between gap-3">
        {/* Player */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs text-neo-white uppercase tracking-wide">
            {t('ghostRival.you')}
          </span>
          <span
            data-testid="ghost-rival-player-score"
            className="text-lg sm:text-xl font-black tabular-nums text-neo-cyan"
          >
            {player.score.toLocaleString()}
          </span>
        </div>

        {/* VS divider */}
        <span className="text-neo-white font-bold text-xs">VS</span>

        {/* Rival */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs text-neo-white truncate max-w-[100px]">
            {rival.username}
          </span>
          <span
            data-testid="ghost-rival-rival-score"
            className="text-lg sm:text-xl font-black tabular-nums text-neo-orange"
          >
            {rival.score.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Gap indicator */}
      <div
        data-testid="ghost-rival-gap"
        className={cn(
          'flex items-center justify-center gap-1.5 py-1 rounded-neo text-xs sm:text-sm font-bold',
          isAhead
            ? 'bg-neo-lime/20 text-neo-lime'
            : 'bg-neo-pink/20 text-neo-pink',
        )}
      >
        {isAhead ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        <span>{gapText}</span>
      </div>

      {/* Footer: countdown + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-neo-white text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>{countdown}</span>
        </div>
        {!isAhead && (
          <span className="text-xs font-bold text-neo-pink animate-pulse">
            {t('ghostRival.cta')}
          </span>
        )}
      </div>
    </div>
  );
});

GhostRivalWidget.displayName = 'GhostRivalWidget';
export default GhostRivalWidget;
