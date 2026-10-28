'use client';

import { BookOpen, Flame, Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { BLAST_RESULT_ASSETS, STAT_STYLE } from './blastResultsTheme';
import type { BlastResultsView, BlastStatChip, BlastStatId } from './blastResultsViewModel';
import type { BlastTranslate } from './types';

const ICONS: Partial<Record<BlastStatId, typeof Flame>> = { combo: Flame, words: BookOpen, waves: Waves };

// Deterministic burst offsets (px) so SSR and client render the same sprites.
const COIN_SPRITES = [[-26, -18], [22, -26], [-8, -40], [30, -6], [-34, 4]] as const;
const DIAMOND_SPRITES = [[-24, -24], [24, -20], [0, -38], [-30, 6], [30, 8]] as const;

interface BlastStatChipsProps {
  view: BlastResultsView;
  t: BlastTranslate;
  locale: string;
}

export function BlastStatChips({ view, t, locale }: BlastStatChipsProps) {
  return (
    <section className="w-full" data-testid="blast-results-stats">
      <ul className="grid grid-cols-3 gap-2">
        {view.stats.map((stat) => (
          <StatChip
            key={stat.id}
            stat={stat}
            label={t(`blast.results.reveal.${stat.id}`)}
            locale={locale}
            burst={
              (stat.id === 'coins' && view.celebrate.coins) || (stat.id === 'diamonds' && view.celebrate.diamonds)
            }
          />
        ))}
      </ul>

      {(view.bestWord || view.longestWord) && (
        <dl className="mt-2 grid grid-cols-2 gap-2" data-reveal="chip">
          {view.bestWord && <WordCell label={t('blast.results.bestWord')} word={view.bestWord} accent="text-neo-lime" />}
          {view.longestWord && (
            <WordCell label={t('blast.results.reveal.longestWord')} word={view.longestWord} accent="text-neo-cyan" />
          )}
        </dl>
      )}
    </section>
  );
}

function StatChip({ stat, label, locale, burst }: { stat: BlastStatChip; label: string; locale: string; burst: boolean }) {
  const style = STAT_STYLE[stat.id];
  const Icon = ICONS[stat.id];
  const sprites = stat.id === 'coins' ? COIN_SPRITES : DIAMOND_SPRITES;
  const spriteSrc = stat.id === 'coins' ? BLAST_RESULT_ASSETS.coin : BLAST_RESULT_ASSETS.diamond;

  return (
    <li
      data-reveal="chip"
      data-testid={`blast-stat-${stat.id}`}
      className="relative flex flex-col items-center gap-0.5 rounded-neo border-3 border-neo-black bg-neo-navy-light px-1 py-2 shadow-hard"
    >
      {burst && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {sprites.map(([x, y], i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={spriteSrc}
              alt=""
              data-reveal={stat.id === 'coins' ? 'coin' : 'diamond'}
              className="absolute h-4 w-4 object-contain"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            />
          ))}
        </span>
      )}
      {style.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={style.image} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
      ) : Icon ? (
        <Icon className={cn('h-8 w-8 p-0.5', style.accent)} strokeWidth={2.5} aria-hidden="true" />
      ) : null}
      <span className={cn('font-neo-display text-xl font-black leading-none tabular-nums', style.accent)} dir="ltr">
        {stat.id === 'combo' ? `x${stat.value}` : safeToLocaleString(stat.value, locale)}
      </span>
      <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wider text-neo-white">{label}</span>
    </li>
  );
}

function WordCell({ label, word, accent }: { label: string; word: string; accent: string }) {
  return (
    <div className="min-w-0 rounded-neo border-2 border-neo-black bg-neo-navy px-2 py-1.5 text-center shadow-hard-sm">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-neo-white">{label}</dt>
      <dd className={cn('truncate font-neo-display text-base font-black uppercase', accent)} dir="auto">
        {word}
      </dd>
    </div>
  );
}
