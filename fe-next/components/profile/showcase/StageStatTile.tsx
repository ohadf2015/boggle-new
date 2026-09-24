'use client';

import React from 'react';
import { BookOpenText, Flame, Gamepad2, Percent, Trophy } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { HeadlineStat, HeadlineStatId } from './profileShowcaseModel';

const META: Record<HeadlineStatId, { Icon: typeof Trophy; color: string; shadow: string }> = {
  bestWord: { Icon: BookOpenText, color: 'text-neo-lime', shadow: 'shadow-hard-lime' },
  wins: { Icon: Trophy, color: 'text-neo-yellow', shadow: 'shadow-hard-yellow' },
  streak: { Icon: Flame, color: 'text-neo-orange', shadow: 'shadow-hard-orange' },
  games: { Icon: Gamepad2, color: 'text-neo-cyan', shadow: 'shadow-hard-cyan' },
  winRate: { Icon: Percent, color: 'text-neo-pink', shadow: 'shadow-hard-pink' },
};

function CountUpNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reduced = useReducedMotion();
  const shown = useCountUp({ target: value, duration: 900, startDelay: 250, immediate: reduced });
  return (
    <span className="tabular-nums" aria-label={`${value.toLocaleString()}${suffix}`}>
      <span aria-hidden>{shown.toLocaleString()}{suffix}</span>
    </span>
  );
}

/** One headline stat on the stage — big number (counts up), tiny label. */
export function StageStatTile({ stat }: { stat: HeadlineStat }): React.ReactElement {
  const { t } = useLanguage();
  const { Icon, color, shadow } = META[stat.id];
  const isWord = stat.id === 'bestWord';
  return (
    <div
      data-testid="stage-stat"
      className={cn(
        'min-w-0 flex flex-col items-center justify-center gap-0.5 px-1.5 py-2',
        'bg-neo-navy-light border-2 border-neo-black rounded-neo',
        shadow,
      )}
    >
      <span className={cn('inline-flex items-center gap-1', color)}>
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.75} aria-hidden />
      </span>
      <span
        className={cn(
          'font-neo-display font-black leading-none max-w-full truncate',
          color,
          isWord
            ? String(stat.value).length > 10 ? 'text-[11px] sm:text-sm' : String(stat.value).length > 7 ? 'text-xs sm:text-base' : 'text-base sm:text-lg'
            : 'text-xl',
        )}
        dir={isWord ? 'auto' : undefined}
      >
        {typeof stat.value === 'number'
          ? <CountUpNumber value={stat.value} suffix={stat.id === 'winRate' ? '%' : ''} />
          : stat.value}
      </span>
      <span className="text-[9px] font-black uppercase tracking-[0.08em] text-neo-white/80 leading-[1.1] text-center line-clamp-2 break-words">
        {t(`profile.showcase.stats.${stat.id}`)}
      </span>
    </div>
  );
}

export default StageStatTile;
