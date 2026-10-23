'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { ArrowUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EDU_DUR, EDU_EASE, EDU_MS, useEduReducedMotion } from '@/lib/education/motion';
import type { TranslateFn, VocabQuizReveal, VocabQuizStanding } from '@/shared/types/vocabQuiz';
import { closeRace, rankMoves } from './vocabQuizRankMoves';

const LIMIT = 5;

/** The wall holds last question's order for a beat, so the class sees who overtook whom. */
export const RANK_SWAP_DELAY_MS = EDU_MS.hold;

interface RevealHistory {
  index: number | null;
  prev: VocabQuizStanding[] | null;
  cur: VocabQuizStanding[] | null;
}

/** Standings from the reveal before this one; survives the question phase, when no reveal is mounted. */
export function usePreviousRevealStandings(reveal: VocabQuizReveal | null): VocabQuizStanding[] | null {
  const [h, setH] = useState<RevealHistory>({ index: null, prev: null, cur: null });
  if (reveal && h.index !== reveal.index) setH({ index: reveal.index, prev: h.cur, cur: reveal.standings });
  return reveal && h.index === reveal.index ? h.prev : h.cur;
}

export interface VocabQuizRankRailProps {
  previous: VocabQuizStanding[] | null;
  /** Server-sorted standings. */
  standings: VocabQuizStanding[];
  t: TranslateFn;
  className?: string;
}

const nameKey = (name: string) => name.trim().toLowerCase();

/** Current players as the wall showed them last time: old order, old scores; newcomers at the bottom on 0. */
function asBefore(standings: VocabQuizStanding[], previous: VocabQuizStanding[]): VocabQuizStanding[] {
  const was = new Map(previous.map((p, i) => [nameKey(p.username), { i, score: p.score }]));
  const at = (p: VocabQuizStanding) => was.get(nameKey(p.username))?.i ?? Number.MAX_SAFE_INTEGER;
  return [...standings]
    .sort((a, b) => at(a) - at(b))
    .map((p) => ({ ...p, score: was.get(nameKey(p.username))?.score ?? 0 }));
}

export function VocabQuizRankRail({ previous, standings, t, className }: VocabQuizRankRailProps) {
  const reduced = useEduReducedMotion();
  const animateSwap = !!previous && !reduced;
  const [swapped, setSwapped] = useState(!animateSwap);
  useEffect(() => {
    if (swapped) return;
    const id = setTimeout(() => setSwapped(true), RANK_SWAP_DELAY_MS);
    return () => clearTimeout(id);
  }, [swapped]);

  const moves = rankMoves(previous, standings);
  const shown = (swapped || !previous ? standings : asBefore(standings, previous)).slice(0, LIMIT);
  const close = swapped && closeRace(standings);

  return (
    <section
      data-testid="vq-rank-rail"
      aria-label={t('results.standings')}
      className={cn('flex min-h-0 flex-col gap-2 rounded-neo border-[3px] border-neo-cream/50 bg-neo-navy-elevated p-3 shadow-hard md:gap-3 md:p-4', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-neo-display text-lg font-black uppercase tracking-wide text-neo-cream md:text-2xl">{t('results.standings')}</h2>
        {close && (
          <span
            data-testid="vq-rail-close"
            className="inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm md:text-base"
          >
            <Zap className="size-4" aria-hidden />
            {t('wordWheel.closeRace')}
          </span>
        )}
      </div>
      <ol className="flex flex-col gap-1.5 md:gap-2">
        {shown.map((p, i) => {
          const up = swapped ? (moves[p.username] ?? 0) : 0;
          return (
            <m.li
              key={p.username}
              layout={reduced ? false : 'position'}
              transition={{ duration: EDU_DUR.countUp, ease: EDU_EASE.outQuint }}
              data-testid="vq-rail-row"
              data-username={p.username}
              className={cn(
                'flex items-center gap-2 rounded-neo border-2 border-neo-black px-2 py-1.5 font-neo-display font-black md:gap-3 md:px-3 md:py-2',
                i === 0 ? 'bg-neo-yellow text-neo-black' : 'bg-neo-navy text-neo-white'
              )}
            >
              <span className="w-6 shrink-0 text-center tabular-nums md:w-8 md:text-xl">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate md:text-xl"><bdi>{p.username}</bdi></span>
              {up > 0 && (
                <span
                  data-testid="vq-rail-up"
                  aria-label={t('wordHunt.leaderboard.movedUp', { count: up })}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full border-2 border-neo-black bg-neo-lime px-1.5 text-xs leading-tight text-neo-black md:text-sm"
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                  {up}
                </span>
              )}
              <span className="shrink-0 tabular-nums md:text-xl">{p.score}</span>
            </m.li>
          );
        })}
      </ol>
    </section>
  );
}

export default VocabQuizRankRail;
