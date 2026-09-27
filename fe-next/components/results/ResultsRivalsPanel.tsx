'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { ChevronUp, ChevronDown, Trophy, Sparkles } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { playersToRivals } from '@/lib/leaderboard/rivalNormalizers';
import { selectClosestRivals } from '@/lib/leaderboard/selectClosestRivals';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import type { Player, WordObject } from '@/components/results/types';

// Pixi victory burst — ssr:false, mounted only on a win (and never under
// reduced motion), so jsdom/headless never touches WebGL.
const RivalVictorySparks = dynamic(() => import('@/components/results/RivalVictorySparks'), {
  ssr: false,
});

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ResultsRivalsPanelProps {
  sortedScores: Player[];
  username: string | undefined;
  t: TFunction;
  reducedMotion: boolean | null;
  /** Per-player word lists; enables the "only you found N" line. */
  allPlayerWords?: Record<string, WordObject[]>;
  /** How many closest rivals to surface (default 3). */
  rivalCount?: number;
}

/**
 * Results-screen "You vs Rivals" panel — the settled-outcome counterpart to the
 * live in-game ClosestRivalsPanel. Anchored on the player's TRUE global rank, it
 * lists the closest rivals with signed, past-tense deltas ("you beat Bob by 12",
 * "Ann edged you by 5") and a proportional gap bar so "how close" is visceral.
 *
 * Reaches every multiplayer mode because it lives inside ResultsMainContent and
 * feeds purely off `sortedScores` (no mode-specific data). Renders nothing for
 * solo games (selectClosestRivals returns null).
 *
 * Neo-brutalist refined: navy-light card, full borders (NO accent side-stripes),
 * pink (multiplayer) header, cyan "YOU" anchor, lime = you're ahead.
 */
const ResultsRivalsPanel: React.FC<ResultsRivalsPanelProps> = ({
  sortedScores,
  username,
  t,
  reducedMotion,
  allPlayerWords,
  rivalCount = 3,
}) => {
  const view = useMemo(() => {
    const rivals = playersToRivals(sortedScores, username);
    return selectClosestRivals(rivals, rivalCount);
  }, [sortedScores, username, rivalCount]);

  const uniqueCount = useMemo(() => {
    if (!allPlayerWords || !username) return 0;
    return selectUniqueWords(allPlayerWords, username).length;
  }, [allPlayerWords, username]);

  // Proportional gap bars: |delta| relative to the widest gap in the shown slice.
  const maxAbsDelta = useMemo(() => {
    if (!view) return 0;
    return view.rows.reduce((mx, r) => Math.max(mx, Math.abs(r.deltaToMe)), 0);
  }, [view]);

  if (!view || view.rows.length <= 1) return null;

  const won = view.me.rank === 1;
  const meIndex = view.rows.findIndex((r) => r.isMe);

  return (
    <section
      data-testid="results-rivals-panel"
      data-component="results-rivals"
      data-won={won ? 'true' : 'false'}
      aria-label={t('results.rivals.aria')}
      className="relative flex flex-col rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard overflow-hidden"
    >
      {won && !reducedMotion && <RivalVictorySparks />}

      {/* Header — pink multiplayer bar with my final standing */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3 py-2 bg-neo-pink/15 border-b-2 border-black">
        <span className="font-neo-display font-bold uppercase tracking-wide text-sm text-neo-pink-light">
          {won ? (
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-neo-yellow" aria-hidden="true" />
              {t('results.rivals.headerWon')}
            </span>
          ) : (
            t('results.rivals.header')
          )}
        </span>
        <span className="flex items-baseline gap-1 font-neo-display">
          <span data-testid="rivals-my-rank" className="text-lg font-black text-neo-cyan tabular-nums leading-none">
            #{view.me.rank}
          </span>
          <span className="text-[11px] font-bold text-neo-cream/60 tabular-nums">
            {t('results.rivals.of')}{' '}
            <span data-testid="rivals-total">{view.total}</span>
          </span>
        </span>
      </header>

      <ul className="relative z-20 flex flex-col gap-1.5 p-2">
        {view.rows.map((row, idx) => {
          const adjacentToMe = meIndex >= 0 && Math.abs(idx - meIndex) === 1;
          const barPct = maxAbsDelta > 0 ? Math.round((Math.abs(row.deltaToMe) / maxAbsDelta) * 100) : 0;
          const aheadOfMe = row.direction === 'ahead';

          return (
            <m.li
              key={row.id}
              initial={reducedMotion ? undefined : { x: row.isMe ? 0 : aheadOfMe ? 16 : -16 }}
              animate={{ x: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : idx * 0.06 }}
              data-testid={`rivals-row-${row.id}`}
              data-row="true"
              data-you={row.isMe ? 'true' : 'false'}
              data-rank={row.rank}
              data-direction={row.direction}
              className={[
                'relative flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 overflow-hidden animate-in fade-in-0 duration-300',
                row.isMe
                  ? 'border-neo-cyan bg-neo-cyan/10'
                  : adjacentToMe
                    ? 'border-black bg-neo-navy'
                    : 'border-black/60 bg-neo-navy/70',
              ].join(' ')}
            >
              {/* Gap bar — fills from the player's side, tinted by who's ahead. */}
              {!row.isMe && barPct > 0 && (
                <m.span
                  aria-hidden
                  initial={reducedMotion ? undefined : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: reducedMotion ? 0 : 0.15 + idx * 0.06 }}
                  className={[
                    'absolute inset-y-0 start-0 origin-left rtl:origin-right pointer-events-none',
                    aheadOfMe ? 'bg-neo-pink/15' : 'bg-neo-lime/15',
                  ].join(' ')}
                  style={{ width: `${barPct}%` }}
                />
              )}

              <span className="relative z-10 font-mono text-xs w-5 text-center shrink-0 opacity-50 tabular-nums">
                {row.rank}
              </span>

              <span className="relative z-10 shrink-0">
                <Avatar size="sm" customAvatar={row.customAvatar ?? undefined} userId={row.id} disableEffects tierMarker />
              </span>

              <span className="relative z-10 flex-1 min-w-0 flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-neo-white">{row.name}</span>
                {row.isMe && (
                  <span className="shrink-0 px-1.5 py-px rounded-md bg-neo-cyan text-neo-navy text-[9px] font-black uppercase tracking-wide">
                    {t('results.rivals.you')}
                  </span>
                )}
              </span>

              <div className="relative z-10 flex flex-col items-end shrink-0">
                <span className="font-bold tabular-nums text-sm leading-none text-neo-white">
                  {row.score.toLocaleString()}
                </span>
                {!row.isMe && (
                  <span
                    data-testid={`rivals-delta-${row.id}`}
                    className={[
                      'mt-1 flex items-center gap-0.5 text-[10px] font-black tabular-nums leading-none uppercase',
                      aheadOfMe ? 'text-neo-pink-light' : row.direction === 'behind' ? 'text-neo-lime' : 'text-neo-cream/70',
                    ].join(' ')}
                  >
                    {aheadOfMe && <ChevronUp className="w-3 h-3" aria-hidden="true" />}
                    {row.direction === 'behind' && <ChevronDown className="w-3 h-3" aria-hidden="true" />}
                    {aheadOfMe
                      ? t('results.rivals.aheadBy', { n: row.deltaToMe })
                      : row.direction === 'behind'
                        ? t('results.rivals.youBeatBy', { n: -row.deltaToMe })
                        : t('results.rivals.tie')}
                  </span>
                )}
              </div>
            </m.li>
          );
        })}
      </ul>

      {/* Absorbed from the now-dead ComparativeInsights: one honest bragging line. */}
      {uniqueCount > 0 && (
        <div
          data-testid="rivals-unique-line"
          className="relative z-20 flex items-center gap-2 px-3 py-2 border-t-2 border-black bg-neo-navy text-sm text-neo-white"
        >
          <Sparkles className="w-4 h-4 text-neo-cyan shrink-0" aria-hidden="true" />
          <span className="font-bold">{t('results.rivals.uniqueWords', { count: uniqueCount })}</span>
        </div>
      )}
    </section>
  );
};

export default ResultsRivalsPanel;
