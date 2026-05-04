'use client';

import { memo } from 'react';
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

function PlayerCard({
  name,
  score,
  active,
  rackCount,
}: {
  name: string;
  score: number;
  active: boolean;
  rackCount: number;
}) {
  return (
    <div
      className={cn(
        'flex-1 min-w-[140px] p-3 rounded-neo border-neo border-black bg-neo-navy-light shadow-hard',
        active && 'ring-4 ring-neo-lime',
      )}
    >
      <div className="text-xs text-neo-cream/70 font-neo-body uppercase tracking-wide">{name}</div>
      <div className="text-3xl font-neo-display font-bold text-neo-white mt-1">{score}</div>
      <div className="text-[10px] text-neo-cream/50 mt-1">{rackCount} tiles</div>
    </div>
  );
}

function WordCraftScoreboardImpl({ player, bot, turn, tilesRemaining, labels }: WordCraftScoreboardProps) {
  const status =
    turn === 'over' ? labels.gameOver : turn === 'player' ? labels.yourTurn : labels.botTurn;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <PlayerCard name={labels.you} score={player.score} active={turn === 'player'} rackCount={player.rack.length} />
        <PlayerCard name={labels.bot} score={bot.score} active={turn === 'bot'} rackCount={bot.rack.length} />
      </div>
      <div className="flex items-center justify-between text-sm bg-neo-navy/60 border-neo border-black rounded-neo px-3 py-2">
        <span className="font-neo-display text-neo-white">{status}</span>
        <span className="text-xs text-neo-cream/70">
          {labels.bagRemaining}: <span className="text-neo-cyan font-bold">{tilesRemaining}</span>
        </span>
      </div>
    </div>
  );
}

export const WordCraftScoreboard = memo(WordCraftScoreboardImpl);
