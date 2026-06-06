'use client';

import { WordCraftDuelResult } from './WordCraftDuelResult';
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
  /** Play-again closure loop — re-rolls a fresh solo game in place. */
  onPlayAgain?: () => void;
  /** Leave to the home/menu screen. */
  onHome?: () => void;
}

export function WordCraftGameOverScene({ t, playerScore, botScore, playerName, botName, isNewBest, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar, onPlayAgain, onHome }: Props) {
  // If in a duel, show duel result instead of vs-bot result
  if (duelOutcome) {
    return <WordCraftDuelResult t={t} playerScore={playerScore} duelOutcome={duelOutcome} currentSeed={currentSeed} currentLocale={currentLocale} challengerName={challengerName} challengerAvatar={challengerAvatar} />;
  }

  const isTie = playerScore === botScore;
  const winnerName = playerScore > botScore
    ? (playerName ?? t('wordcraft.you'))
    : (botName ?? t('wordcraft.bot'));
  const label = isTie
    ? t('wordcraft.tied')
    : t('wordcraft.winnerLabel').replace('{{name}}', winnerName);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[140px] z-40 flex flex-col items-center gap-2">
      {isNewBest ? (
        <div className="animate-neo-pop px-3 py-1.5 bg-neo-lime border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider">
          🏆 {t('wordcraft.newBest')}
        </div>
      ) : null}
      <div
        role="status"
        className="px-4 py-3 bg-neo-yellow border-neo-thick border-black text-neo-navy rounded-neo shadow-hard-lg font-neo-display font-black uppercase tracking-wider"
      >
        {label}
      </div>
      {(onPlayAgain || onHome) ? (
        <div className="flex items-center gap-2 mt-1">
          {onPlayAgain ? (
            <button
              type="button"
              onClick={onPlayAgain}
              className="px-4 py-2 bg-neo-lime border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
            >
              ↻ {t('wordcraft.playAgain')}
            </button>
          ) : null}
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="px-4 py-2 bg-neo-cyan border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
            >
              {t('wordcraft.home')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
