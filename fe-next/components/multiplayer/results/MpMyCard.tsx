'use client';

import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { memo } from 'react';
import Image from 'next/image';
import { Coins, Sparkles, Star } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { cn } from '@/lib/utils';
import { MASCOT_SRC, mascotFor } from './mpResultsView';
import type { ResultCallout } from './mpResultsStory';
import { MEDAL_SRC, MpCalloutLine, ResultArt } from './MpResultArt';
import fx from './mpResults.module.css';

const REWARD_DELAY_MS = 450;
const REWARD_STAGGER_MS = 160;

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpMyCardProps {
  /** Shared competition rank (ties read the same number). */
  rank: number;
  /** Sole or shared 1st WITH points (`podiumTier === 1`) — the gold treatment. */
  winner: boolean;
  total: number;
  /** The server's round score for me. */
  score: number;
  bestWord: { word: string; score: number } | null;
  xp: number | null;
  coins: number | null;
  /** The one rivalry line (photo finish, comeback, gap…), already prioritised. */
  callout: ResultCallout | null;
  /** The card's beat has landed: counters roll from 0 to the server number. */
  revealed: boolean;
  /**
   * Final screen of a series: rank/score/gap are the SERIES placing (the
   * verdict), labelled as such; the rows keep the round numbers.
   */
  series?: boolean;
  /**
   * The teacher hid the leaderboard and this is not the final reveal: no rank
   * stamp, no winner gold, no tied/ahead/behind — own numbers only, and the
   * mascot keeps a neutral face (a victory or loser face IS the placing).
   */
  hideClassPosition?: boolean;
  t: TFn;
  className?: string;
}

/**
 * "Where did I land": a stamped rank, the mascot's reaction, my points rolling
 * up, the best word and what I earned. Numbers are the server's (the counter
 * only animates the display, from 0 to `score`).
 */
function MpMyCardImpl({ rank, winner, total, score, bestWord, xp, coins, callout, revealed, series = false, hideClassPosition = false, t, className }: MpMyCardProps) {
  const calm = hideClassPosition;
  // A class that lost to the boss has no winner: the top scorer keeps a rank, not a crown.
  const lostBoss = useClassroomBossStore((s) => s.view?.status === 'escaped');
  const mood = calm || (lostBoss && winner) ? 'cheer' : mascotFor(rank, total, score);
  const showWinner = !calm && winner && !lostBoss;
  const medal = !calm && score > 0 && rank >= 1 && rank <= 3 ? (rank as 1 | 2 | 3) : null;
  const rewards = [
    xp != null && xp > 0 ? { id: 'xp', label: t('mpUi.results.xp', { xp }), icon: Sparkles, tone: 'bg-neo-cyan' } : null,
    coins != null && coins > 0 ? { id: 'coins', label: t('mpUi.results.coins', { coins }), icon: Coins, tone: 'bg-neo-yellow' } : null,
  ].filter((r) => r !== null);

  return (
    <section
      data-testid="mp-my-card"
      data-winner={String(showWinner)}
      data-series={String(series)}
      aria-label={t('mpUi.results.yourRank')}
      className={cn(
        'relative flex items-center min-w-0 rounded-neo-lg border-[3px] border-neo-black shadow-hard',
        // pt clears the DETAILS tab that overhangs the card's top edge.
        'gap-[calc(12px*var(--mp-u,1))] p-[calc(10px*var(--mp-u,1))] pt-[calc(20px*var(--mp-u,1))]',
        showWinner ? 'bg-neo-yellow text-neo-black' : 'bg-neo-cream text-neo-black',
        !revealed && 'invisible',
        revealed && fx.cardIn,
        className,
      )}
    >
      <div className="relative shrink-0 w-[calc(76px*var(--mp-u,1))] h-[calc(76px*var(--mp-u,1))]">
        <Image
          src={MASCOT_SRC[mood]}
          alt=""
          width={152}
          height={152}
          className={cn('w-full h-full object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))]', revealed && fx.mascotHop)}
        />
        {!calm && (medal ? (
          <span data-testid="mp-my-rank" data-medal={medal} className={cn('absolute -bottom-2 -end-3 block w-[calc(44px*var(--mp-u,1))] h-[calc(44px*var(--mp-u,1))]', revealed && fx.medalDrop)}>
            <span className="sr-only">#{rank}</span>
            <ResultArt
              src={MEDAL_SRC[medal]}
              className="w-full h-full object-contain drop-shadow-[2px_2px_0_rgb(var(--neo-black))]"
              fallback={<span aria-hidden="true" className={cn('grid place-items-center w-full h-full rounded-neo border-[3px] border-neo-black shadow-hard-sm font-neo-display font-bold tabular-nums text-[calc(20px*var(--mp-u,1))]', showWinner ? 'bg-neo-lime' : 'bg-neo-cyan')}>#{rank}</span>}
            />
          </span>
        ) : (
          <span
            data-testid="mp-my-rank"
            className={cn(
              'absolute -bottom-1 -end-2 grid place-items-center rounded-neo border-[3px] border-neo-black shadow-hard-sm font-neo-display font-bold tabular-nums',
              'min-w-[calc(40px*var(--mp-u,1))] h-[calc(34px*var(--mp-u,1))] px-1 text-[calc(20px*var(--mp-u,1))]',
              'bg-neo-pink',
              revealed && fx.stamp,
            )}
          >
            #{rank}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-[calc(4px*var(--mp-u,1))]">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-neo-display font-bold uppercase leading-none text-[calc(15px*var(--mp-u,1))] truncate">
            {calm
              ? t(series ? 'mpUi.results.seriesPts' : 'mpUi.results.roundPoints')
              : showWinner
                ? t(series ? 'mpUi.results.seriesChampion' : 'mpUi.results.winner')
                : series
                  ? t('mpUi.results.seriesPlace', { rank, total })
                  : `#${rank} ${t('mpUi.results.placeOf', { total })}`}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span data-testid="mp-my-score" className="font-neo-display font-bold tabular-nums leading-none text-[calc(38px*var(--mp-u,1))]">
            <AnimatedCounter value={revealed ? score : 0} previousValue={0} size="xl" className="text-neo-black !text-[length:inherit]" />
          </span>
          <span className="min-w-0 truncate font-neo-body font-bold text-[calc(13px*var(--mp-u,1))] opacity-70">{t(series ? 'mpUi.results.seriesPts' : 'mpUi.results.pts')}</span>
        </div>
        {!calm && callout && <MpCalloutLine callout={callout} revealed={revealed} t={t} />}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {bestWord && (
            <span data-testid="mp-my-best-word" className={cn('inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-lime px-2 py-0.5 text-[calc(12px*var(--mp-u,1))] font-bold max-w-full min-w-0', revealed && fx.chipPop)}>
              <Star aria-hidden="true" className="w-3.5 h-3.5 shrink-0 fill-neo-black" />
              <span data-testid="mp-my-best-word-label" className="shrink-0 uppercase font-neo-body text-[0.8em] tracking-wide opacity-70">
                {t('mpUi.results.bestWord')}
              </span>
              <span dir="auto" className="uppercase truncate font-neo-display">{bestWord.word}</span>
              <span dir="ltr" className="tabular-nums opacity-70">+{bestWord.score}</span>
            </span>
          )}
          {rewards.map((r, i) => (
            <span
              key={r.id}
              data-testid={`mp-my-${r.id}`}
              style={{ animationDelay: `${REWARD_DELAY_MS + i * REWARD_STAGGER_MS}ms` }}
              className={cn('inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-2 py-0.5 text-[calc(12px*var(--mp-u,1))] font-bold', r.tone, revealed && fx.rewardPop)}
            >
              <r.icon aria-hidden="true" className="w-3.5 h-3.5" />
              {r.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export const MpMyCard = memo(MpMyCardImpl);
MpMyCard.displayName = 'MpMyCard';
