'use client';

import { memo } from 'react';
import { Hourglass } from 'lucide-react';
import type { PlayerState } from '@/lib/word-craft/types';
import type { Turn } from '@/lib/word-craft/useWordCraftGame';
import { cn } from '@/lib/utils';

export interface WordCraftScoreboardProps {
  player: PlayerState;
  bot: PlayerState;
  turn: Turn;
  tilesRemaining: number;
  labels: {
    you: string;
    bot: string;
    yourTurn: string;
    botTurn: string;
    gameOver: string;
    bagRemaining: string;
  };
}

/**
 * Kinetic split-bar scoreboard.
 *
 * Replaces the dual-card+VS template. Both scores share one horizontal bar where
 * the lime/pink boundary slides with the current lead — the *territory* metaphor
 * makes the lead visible without comparing two numbers.
 *
 * - When tied: bar splits 50/50.
 * - When player leads by 50: ~75/25 lime.
 * - Capped at 90/10 so the trailing side never disappears.
 *
 * No card grid, no border-left stripes, no gradient text. Reads in any locale
 * (numbers + bag count are tabular).
 */
function WordCraftScoreboardImpl({ player, bot, turn, tilesRemaining, labels }: WordCraftScoreboardProps) {
  const total = player.score + bot.score;
  // Smoothed split: dampen at low totals so opening moves don't whip the bar.
  const rawPct = total === 0 ? 50 : (player.score / total) * 100;
  const dampened = total < 20 ? 50 + (rawPct - 50) * (total / 20) : rawPct;
  const pct = Math.max(10, Math.min(90, dampened));

  const status =
    turn === 'over' ? labels.gameOver : turn === 'player' ? labels.yourTurn : labels.botTurn;
  const turnTone =
    turn === 'over'
      ? 'text-neo-yellow'
      : turn === 'player'
        ? 'text-neo-lime'
        : 'text-neo-pink';

  return (
    <div className="space-y-2">
      {/* Score numbers + names */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex items-baseline gap-2">
          <span
            data-score-value="player"
            className="font-neo-display font-black text-4xl sm:text-5xl text-neo-lime leading-none tabular-nums origin-bottom-left inline-block"
          >
            {player.score}
          </span>
          <span className="text-[10px] sm:text-xs font-neo-display font-black uppercase tracking-widest text-neo-white">
            {labels.you}
          </span>
        </div>
        <div className="text-[10px] font-neo-display font-black uppercase tracking-widest text-neo-white">
          {/* No "VS" word — let the bar do the work */}
          —
        </div>
        <div className="flex items-baseline gap-2 flex-row-reverse">
          <span
            data-score-value="bot"
            className="font-neo-display font-black text-4xl sm:text-5xl text-neo-pink leading-none tabular-nums origin-bottom-right inline-block"
          >
            {bot.score}
          </span>
          <span className="text-[10px] sm:text-xs font-neo-display font-black uppercase tracking-widest text-neo-white">
            {labels.bot}
          </span>
        </div>
      </div>

      {/* Kinetic split bar */}
      <div
        role="img"
        aria-label={`${labels.you} ${player.score} · ${labels.bot} ${bot.score}`}
        className="relative h-3 sm:h-3.5 bg-neo-pink border-neo border-black rounded-neo overflow-hidden shadow-hard-sm"
      >
        <div
          className="wc-bar-fill absolute inset-y-0 start-0 bg-neo-lime border-e-2 border-black"
          style={{ width: `${pct}%` }}
        />
        {/* Center seam — sits at 50% so you can see the deviation at a glance */}
        <span aria-hidden className="absolute inset-y-0 start-1/2 w-px bg-black/40" />
      </div>

      {/* Tiny meta strip: turn + bag */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs px-1">
        <span data-scoreboard-card={turn === 'bot' ? 'bot' : 'player'}
          className={cn('font-neo-display font-black uppercase tracking-wider', turnTone)}
        >
          <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-current me-1.5 align-middle" />
          {status}
        </span>
        <span className="inline-flex items-center gap-1 text-neo-white">
          <Hourglass className="w-3 h-3" aria-hidden />
          <span className="font-neo-body">{labels.bagRemaining}</span>
          <span className="font-neo-display font-black tabular-nums text-neo-cyan ms-0.5">
            {tilesRemaining}
          </span>
        </span>
      </div>
    </div>
  );
}

export const WordCraftScoreboard = memo(WordCraftScoreboardImpl);
