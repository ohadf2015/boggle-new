'use client';

import { BookOpen, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { STAT_STYLE } from './blastResultsTheme';
import type { BlastResultsView, BlastStatId } from './blastResultsViewModel';
import type { BlastResultsT } from './types';

const LOOT: readonly BlastStatId[] = ['coins', 'diamonds', 'bombs'];
const SECONDARY = [
  { id: 'combo', Icon: Flame },
  { id: 'words', Icon: BookOpen },
] as const;

/** Earned rewards in one row that count up, with the run's secondary stats as small chips under it. */
export function BlastLootRow({ view, t, locale }: { view: BlastResultsView; t: BlastResultsT; locale: string }) {
  const byId = new Map(view.stats.map((s) => [s.id, s.value]));
  const loot = LOOT.filter((id) => byId.has(id));
  const secondary = SECONDARY.filter(({ id }) => byId.has(id));

  return (
    <section
      data-testid="blast-results-loot"
      className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard"
    >
      <h3 className="px-3 pt-2.5 font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white tv:text-lg">
        {t('blast.results.loot', 'Loot')}
      </h3>
      <ul className="flex py-2">
        {loot.map((id) => {
          const value = byId.get(id) ?? 0;
          const style = STAT_STYLE[id];
          return (
            <li
              key={id}
              data-testid={`blast-stat-${id}`}
              data-reveal="loot"
              className={cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 border-neo-black/60 px-1 not-first:border-s-2', value === 0 && 'opacity-60')}
            >
              {style.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={style.image} alt="" aria-hidden="true" className="h-10 w-10 object-contain drop-shadow-[2px_2px_0_rgb(var(--neo-black))] tv:h-16 tv:w-16" />
              )}
              <span
                data-countup={value}
                className={cn('font-neo-display text-2xl font-black leading-none tabular-nums tv:text-4xl', style.accent)}
                dir="ltr"
              >
                {safeToLocaleString(value, locale)}
              </span>
              <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wider text-neo-white tv:text-sm">
                {t(`blast.results.reveal.${id}`)}
              </span>
            </li>
          );
        })}
      </ul>
      {secondary.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-1.5 border-t-2 border-neo-black/60 px-2 py-2">
          {secondary.map(({ id, Icon }) => {
            const value = byId.get(id) ?? 0;
            return (
              <li
                key={id}
                data-testid={`blast-results-secondary-${id}`}
                className="inline-flex items-center gap-1 rounded-md border-2 border-neo-black bg-neo-navy px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neo-white tv:text-base"
              >
                <Icon className={cn('h-3.5 w-3.5 tv:h-5 tv:w-5', STAT_STYLE[id].accent)} strokeWidth={2.75} aria-hidden="true" />
                <bdi className={cn('font-neo-display font-black tabular-nums', STAT_STYLE[id].accent)}>
                  {id === 'combo' ? `x${value}` : safeToLocaleString(value, locale)}
                </bdi>
                {t(`blast.results.reveal.${id}`)}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
