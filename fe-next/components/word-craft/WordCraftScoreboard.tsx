'use client';

import { memo } from 'react';
import { Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { PlayerState } from '@/lib/word-craft/types';
import type { Turn } from '@/lib/word-craft/useWordCraftGame';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';

export interface WordCraftScoreboardProps {
  player: PlayerState;
  bot: PlayerState;
  turn: Turn;
  tilesRemaining: number;
  /** Avatar + seed for each side — the opponent always has a face, never a bare "WordBot". */
  playerAvatar?: CustomAvatarConfig | null;
  playerSeed?: string;
  opponentAvatar?: CustomAvatarConfig | null;
  opponentSeed?: string;
  labels: {
    you: string;
    bot: string;
    yourTurn: string;
    botTurn: string;
    gameOver: string;
    bagRemaining: string;
  };
  /**
   * Claimed-cell counts, folded into the scoreboard meta row so territory is
   * part of the one score HUD instead of a separate stacked band. Colors track
   * the scoreboard's own language: lime = you, pink = opponent. Omit to hide.
   */
  territory?: {
    playerCount: number;
    botCount: number;
    label: string;
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
function WordCraftScoreboardImpl({
  player,
  bot,
  turn,
  tilesRemaining,
  playerAvatar,
  playerSeed,
  opponentAvatar,
  opponentSeed,
  labels,
  territory,
}: WordCraftScoreboardProps) {
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
    <div className="space-y-1">
      {/* Score numbers + names */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            customAvatar={playerAvatar ?? null}
            userId={playerSeed || labels.you}
            size="sm"
            mode="singleplayer"
            disableEffects
          />
          <span
            data-score-value="player"
            className="font-neo-display font-black text-3xl sm:text-4xl text-neo-lime leading-none tabular-nums origin-bottom-left inline-block"
          >
            {player.score}
          </span>
          <span className="text-[10px] sm:text-xs font-neo-display font-black uppercase tracking-widest text-neo-white truncate">
            {labels.you}
          </span>
        </div>
        <div className="text-[10px] font-neo-display font-black uppercase tracking-widest text-neo-white">
          {/* No "VS" word — let the bar do the work */}
          —
        </div>
        <div className="flex items-center gap-2 flex-row-reverse min-w-0">
          <Avatar
            customAvatar={opponentAvatar ?? null}
            userId={opponentSeed || labels.bot}
            size="sm"
            mode="multiplayer"
            disableEffects
          />
          <span
            data-score-value="bot"
            className="font-neo-display font-black text-3xl sm:text-4xl text-neo-pink leading-none tabular-nums origin-bottom-right inline-block"
          >
            {bot.score}
          </span>
          <span className="text-[10px] sm:text-xs font-neo-display font-black uppercase tracking-widest text-neo-white truncate">
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
        {/* Territory, folded in: claimed-cell counts as a compact lime/pink chip
            so it shares the score HUD instead of a separate stacked band. Only
            once cells exist (matches the old strip's total>0 gate). */}
        {territory && territory.playerCount + territory.botCount > 0 ? (
          <span
            data-testid="wc-scoreboard-territory"
            className="inline-flex items-center gap-1.5 font-neo-display font-black tabular-nums"
            aria-label={`${territory.label}: ${territory.playerCount} · ${territory.botCount}`}
          >
            <Crown className="w-3 h-3 text-neo-white/70" aria-hidden />
            <span className="text-neo-lime">{territory.playerCount}</span>
            <span aria-hidden className="text-neo-white/30">·</span>
            <span className="text-neo-pink">{territory.botCount}</span>
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-neo-white">
          {/* The tile sack — letters left to draw. Gives the bag count a
              physical object instead of a generic hourglass; it wobbles on the
              final rack to signal the bag is nearly empty. Static export →
              plain <img>, not next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/word-craft/tile-sack.png"
            alt=""
            aria-hidden
            data-wc-sack=""
            width={20}
            height={23}
            className={cn(
              'w-5 h-auto select-none -my-1 drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]',
              tilesRemaining > 0 && tilesRemaining <= 7 && 'animate-neo-wobble',
            )}
          />
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
