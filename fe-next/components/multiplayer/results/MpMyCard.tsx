'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Coins, Sparkles, Star } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { cn } from '@/lib/utils';
import { MASCOT_SRC, mascotFor, type RivalGap } from './mpResultsView';
import fx from './mpResults.module.css';

type TFn = (key: string, params?: Record<string, string | number>) => string;

export interface MpMyCardProps {
  rank: number;
  total: number;
  /** The server's round score for me. */
  score: number;
  bestWord: { word: string; score: number } | null;
  xp: number | null;
  coins: number | null;
  gap: RivalGap | null;
  /** The card's beat has landed: counters roll from 0 to the server number. */
  revealed: boolean;
  t: TFn;
  className?: string;
}

/**
 * "Where did I land": a stamped rank, the mascot's reaction, my points rolling
 * up, the best word and what I earned. Numbers are the server's (the counter
 * only animates the display, from 0 to `score`).
 */
function MpMyCardImpl({ rank, total, score, bestWord, xp, coins, gap, revealed, t, className }: MpMyCardProps) {
  const mood = mascotFor(rank, total);
  const winner = rank === 1 && total > 1;
  const gapLine = !gap
    ? null
    : gap.points === 0
      ? t('mpUi.results.tiedWith', { name: gap.name })
      : gap.kind === 'ahead'
        ? t('mpUi.results.ahead', { points: gap.points, name: gap.name })
        : t('mpUi.results.behind', { points: gap.points, name: gap.name });

  return (
    <section
      data-testid="mp-my-card"
      aria-label={t('mpUi.results.yourRank')}
      className={cn(
        'relative flex items-center min-w-0 rounded-neo-lg border-[3px] border-neo-black shadow-hard',
        'gap-[calc(12px*var(--mp-u,1))] p-[calc(10px*var(--mp-u,1))]',
        winner ? 'bg-neo-yellow text-neo-black' : 'bg-neo-cream text-neo-black',
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
          className={cn('w-full h-full object-contain drop-shadow-[3px_3px_0_#000]', revealed && fx.mascotHop)}
        />
        <span
          data-testid="mp-my-rank"
          className={cn(
            'absolute -bottom-1 -end-2 grid place-items-center rounded-neo border-[3px] border-neo-black shadow-hard-sm font-neo-display font-bold tabular-nums',
            'min-w-[calc(40px*var(--mp-u,1))] h-[calc(34px*var(--mp-u,1))] px-1 text-[calc(20px*var(--mp-u,1))]',
            winner ? 'bg-neo-lime' : rank <= 3 ? 'bg-neo-cyan' : 'bg-neo-pink',
            revealed && fx.stamp,
          )}
        >
          #{rank}
        </span>
      </div>

      <div className="min-w-0 flex-1 flex flex-col gap-[calc(4px*var(--mp-u,1))]">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-neo-display font-bold uppercase leading-none text-[calc(15px*var(--mp-u,1))] truncate">
            {winner ? t('mpUi.results.winner') : `#${rank} ${t('mpUi.results.placeOf', { total })}`}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span data-testid="mp-my-score" className="font-neo-display font-bold tabular-nums leading-none text-[calc(38px*var(--mp-u,1))]">
            <AnimatedCounter value={revealed ? score : 0} previousValue={0} size="xl" className="text-neo-black !text-[length:inherit]" />
          </span>
          <span className="font-neo-body font-bold text-[calc(13px*var(--mp-u,1))] opacity-70">{t('mpUi.results.pts')}</span>
        </div>
        {gapLine && (
          <p dir="auto" className="font-neo-body font-semibold leading-tight text-[calc(12px*var(--mp-u,1))] truncate">{gapLine}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {bestWord && (
            <span className={cn('inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-lime px-2 py-0.5 text-[calc(12px*var(--mp-u,1))] font-bold max-w-full', revealed && fx.chipPop)}>
              <Star aria-hidden="true" className="w-3.5 h-3.5 shrink-0 fill-neo-black" />
              <span className="sr-only">{t('mpUi.results.bestWord')}</span>
              <span dir="auto" className="uppercase truncate">{bestWord.word}</span>
              <span className="tabular-nums opacity-70">+{bestWord.score}</span>
            </span>
          )}
          {xp != null && xp > 0 && (
            <span data-testid="mp-my-xp" className={cn('inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cyan px-2 py-0.5 text-[calc(12px*var(--mp-u,1))] font-bold', fx.chipPop)}>
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
              {t('mpUi.results.xp', { xp })}
            </span>
          )}
          {coins != null && coins > 0 && (
            <span data-testid="mp-my-coins" className={cn('inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 text-[calc(12px*var(--mp-u,1))] font-bold', fx.chipPop)}>
              <Coins aria-hidden="true" className="w-3.5 h-3.5" />
              {t('mpUi.results.coins', { coins })}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

export const MpMyCard = memo(MpMyCardImpl);
MpMyCard.displayName = 'MpMyCard';
