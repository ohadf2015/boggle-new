'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { quickRank, QUICK_RANKS } from './quickRank';
import { QuickDetailCard } from './QuickDetailCard';
import { safeToLocaleString } from '@/utils/bcp47Locale';

interface QuickPlayRankCardProps {
  totalPoints: number;
  percentileToday: number;
  scorePct: number;
}

/**
 * Rank ladder — the between-rounds progression beat.
 *
 * A single "0 / 300 to Bronze" bar told the player nothing about the shape of
 * the climb: how many tiers there are, what the next one costs, or how far the
 * top is. This shows the neighbouring rungs with their real thresholds and
 * marks where this round landed you, so the next round has a named target.
 */
export function QuickPlayRankCard({ totalPoints, percentileToday, scorePct }: QuickPlayRankCardProps) {
  const { t, language } = useLanguage();
  const rankNow = quickRank(totalPoints);
  const idx = QUICK_RANKS.findIndex((r) => r.key === rankNow.key);
  // Show the rung you're on plus the two ahead — the climb, not the whole
  // ladder (7 rows of thresholds is a wall, and the ones behind you are done).
  const rungs = QUICK_RANKS.slice(idx, idx + 3).reverse();
  const top = QUICK_RANKS[QUICK_RANKS.length - 1];
  const toNext = rankNow.nextAt === null ? 0 : rankNow.nextAt - totalPoints;

  return (
    <QuickDetailCard
      testId="quick-rank-bar"
      band="bg-neo-pink"
      title={t('quickPlay.solo.rankLadder', 'Rank')}
      aside={<span data-testid="quick-rank-total">{safeToLocaleString(totalPoints, language)}</span>}
      bodyClassName="p-3"
    >
      <ul className="flex flex-col gap-1">
        {rungs.map((rung) => {
          const isCurrent = rung.key === rankNow.key;
          return (
            <li
              key={rung.key}
              data-testid={`quick-rank-rung-${rung.key}`}
              data-current={isCurrent || undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                isCurrent
                  ? '-rotate-1 border-[3px] border-black bg-neo-abyss py-2.5 text-sm shadow-hard'
                  : 'border-2 border-dashed border-neo-white/15 opacity-70'
              }`}
            >
              {isCurrent && <span aria-hidden="true" className={`font-neo-display text-base ${rung.color}`}>▶</span>}
              <span
                className={`min-w-0 flex-1 truncate font-neo-display font-bold tracking-wide ${rung.color} ${
                  isCurrent ? 'text-lg [text-shadow:0_2px_0_#000]' : ''
                }`}
              >
                {t(`quickPlay.solo.rank.${rung.key}`)}
              </span>
              {isCurrent && rankNow.nextAt !== null && (
                /* Not shrink-0: the tier names carry real words now, and in
                   Hebrew — the primary locale — "בלתי ניתנים לעצירה" next to a
                   long current rung would squeeze the rung name to nothing. */
                <span className="min-w-0 max-w-[55%] truncate text-[11px] text-neo-white/70">
                  {t('quickPlay.solo.rankToNext', '{pts} to {rank}', {
                    pts: safeToLocaleString(toNext, language),
                    rank: t(`quickPlay.solo.rank.${QUICK_RANKS[idx + 1].key}`),
                  })}
                </span>
              )}
              {/* The rung you're on already says what the next one costs;
                  repeating its own threshold there reads as a second score. */}
              <span className="w-14 shrink-0 text-right font-neo-display tabular-nums text-neo-white/60">
                {isCurrent ? '' : safeToLocaleString(rung.at, language)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 h-5 overflow-hidden rounded-full border-[3px] border-black bg-neo-abyss shadow-hard-sm">
        <i
          className="block h-full origin-left border-r-[3px] border-black bg-neo-lime bg-[repeating-linear-gradient(-45deg,transparent_0_6px,rgba(0,0,0,0.14)_6px_12px)] animate-[qp-bar-fill_0.9s_cubic-bezier(0.3,0.9,0.4,1)_0.3s_both] motion-reduce:animate-none rtl:origin-right"
          style={{ width: `${Math.round(rankNow.progress * 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="rotate-1 rounded-md border-2 border-black bg-neo-lime px-1.5 py-0.5 font-neo-display font-bold text-black shadow-hard-sm" data-testid="quick-rank-gained">
          {t('quickPlay.solo.rankGained', { pts: String(scorePct) })}
        </span>
        <span className="text-neo-white/50">
          {rankNow.nextAt === null
            ? t('quickPlay.solo.rankMax')
            : t('quickPlay.solo.rankToTop', '{pts} to {rank}', {
                pts: safeToLocaleString(Math.max(0, top.at - totalPoints), language),
                rank: t(`quickPlay.solo.rank.${top.key}`),
              })}
        </span>
      </div>

      {/* Percentile rail — kept, but under the ladder: it answers "vs everyone
          today", which is a different question from "how far up am I". Hidden
          when there is no percentile to draw, rather than shown empty. */}
      {percentileToday > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full border-2 border-black bg-neo-abyss" aria-hidden="true">
          <i className="block h-full bg-neo-cyan" style={{ width: `${percentileToday}%` }} />
        </div>
      )}
    </QuickDetailCard>
  );
}
