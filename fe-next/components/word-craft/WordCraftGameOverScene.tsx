'use client';

import { cn } from '@/lib/utils';
import { WordCraftDuelResult } from './WordCraftDuelResult';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { BotDifficulty } from '@/lib/word-craft/botDifficulty';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface Props {
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  playerScore: number;
  botScore: number;
  /** Seat names — override the default You/WordBot (e.g. hot-seat Player 1/2). */
  playerName?: string;
  botName?: string;
  /** Player just set a new single-player personal best this game. */
  isNewBest?: boolean;
  /** Duel result when playing vs a remote challenger via a duel link */
  duelOutcome?: { outcome: 'win' | 'lose' | 'tie'; challengerName: string; challengerScore: number; challengerAvatar?: CustomAvatarConfig };
  /** Current game seed for building outgoing duel links */
  currentSeed?: number;
  /** Current locale for building outgoing duel links */
  currentLocale?: string;
  /** This player's identity for outgoing re-challenge links (from auth profile). */
  challengerName?: string;
  challengerAvatar?: CustomAvatarConfig;
  /** Board dims + bot difficulty just played — embedded in re-challenge links. */
  currentDims?: BoardDims;
  currentDifficulty?: BotDifficulty;
  /** Play-again closure loop — re-rolls a fresh solo game in place. */
  onPlayAgain?: () => void;
  /** Leave to the home/menu screen. */
  onHome?: () => void;
}

export function WordCraftGameOverScene({ t, playerScore, botScore, playerName, botName, isNewBest, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar, currentDims, currentDifficulty, onPlayAgain, onHome }: Props) {
  // If in a duel, show duel result instead of vs-bot result
  if (duelOutcome) {
    return (
      <WordCraftDuelResult
        t={t}
        playerScore={playerScore}
        duelOutcome={duelOutcome}
        currentSeed={currentSeed}
        currentLocale={currentLocale}
        challengerName={challengerName}
        challengerAvatar={challengerAvatar}
        dims={currentDims}
        difficulty={currentDifficulty}
        onPlayAgain={onPlayAgain}
        onHome={onHome}
      />
    );
  }

  const isTie = playerScore === botScore;
  const playerLabel = playerName ?? t('wordcraft.you');
  const botLabel = botName ?? t('wordcraft.bot');
  const winnerName = playerScore > botScore ? playerLabel : botLabel;
  const label = isTie
    ? t('wordcraft.tied')
    : t('wordcraft.winnerLabel').replace('{{name}}', winnerName);
  const playerWon = !isTie && playerScore > botScore;
  const squares = t('wordcraft.squares', 'squares');

  // Full-screen modal: a small bottom banner was easy to miss, so players were
  // unsure the game had actually ended. A dim backdrop + centered card makes the
  // finish unmistakable and puts the result (square counts) + next action front
  // and center.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wordcraft.gameOver', 'Game over')}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-neo-pop"
    >
      <div className="relative w-full max-w-sm flex flex-col items-center gap-4 bg-neo-navy-light border-neo-thick border-black rounded-neo shadow-hard-lg p-6">
        <span className="text-[11px] font-neo-display font-black uppercase tracking-[0.2em] text-neo-white/70">
          {t('wordcraft.gameOver', 'Game over')}
        </span>

        {isNewBest ? (
          <div className="animate-neo-pop px-3 py-1.5 bg-neo-lime border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider">
            🏆 {t('wordcraft.newBest')}
          </div>
        ) : null}

        <div
          role="status"
          className="w-full text-center px-4 py-3 bg-neo-yellow border-neo-thick border-black text-neo-navy rounded-neo shadow-hard-lg font-neo-display font-black uppercase tracking-wider text-lg"
        >
          {label}
        </div>

        {/* Concrete result: how many squares each side controls at the buzzer. */}
        <div className="flex items-stretch gap-3 w-full">
          <div className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-3 rounded-neo border-neo-thick border-black',
            playerWon ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-navy text-neo-cyan',
          )}>
            <span className="text-3xl font-neo-display font-black leading-none">{playerScore}</span>
            <span className="text-[10px] font-neo-body uppercase tracking-wider truncate max-w-full px-1">{playerLabel} · {squares}</span>
          </div>
          <div className={cn(
            'flex-1 flex flex-col items-center gap-0.5 py-3 rounded-neo border-neo-thick border-black',
            !playerWon && !isTie ? 'bg-neo-pink text-neo-white' : 'bg-neo-navy text-neo-pink',
          )}>
            <span className="text-3xl font-neo-display font-black leading-none">{botScore}</span>
            <span className="text-[10px] font-neo-body uppercase tracking-wider truncate max-w-full px-1">{botLabel} · {squares}</span>
          </div>
        </div>

        {(onPlayAgain || onHome) ? (
          <div className="flex items-center gap-2 w-full">
            {onPlayAgain ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex-1 px-4 py-2.5 bg-neo-lime border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
              >
                ↻ {t('wordcraft.playAgain')}
              </button>
            ) : null}
            {onHome ? (
              <button
                type="button"
                onClick={onHome}
                className="flex-1 px-4 py-2.5 bg-neo-cyan border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
              >
                {t('wordcraft.home')}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
