'use client';

import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { WordCraftDuelResult } from './WordCraftDuelResult';
import { WordCraftPlayFriendControl } from './WordCraftPlayFriendControl';
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
  /** Local player's avatar (from auth profile) — shown beside their score column. */
  playerAvatar?: CustomAvatarConfig;
  /** Opponent's avatar (e.g. bot/seat). When absent a seeded fallback is generated. */
  opponentAvatar?: CustomAvatarConfig;
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
  /**
   * Player chose "Challenge a Friend" at setup — the duel link is the whole
   * point of this game, so the share block gets a headline + entrance pop.
   */
  challengeIntent?: boolean;
  /** Play-again closure loop — re-rolls a fresh solo game in place. */
  onPlayAgain?: () => void;
  /** Leave to the home/menu screen. */
  onHome?: () => void;
}

export function WordCraftGameOverScene({ t, playerScore, botScore, playerName, botName, isNewBest, playerAvatar, opponentAvatar, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar, currentDims, currentDifficulty, challengeIntent, onPlayAgain, onHome }: Props) {
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
  const playerWon = !isTie && playerScore > botScore;
  // Hot-seat (pass-and-play) supplies explicit seat names — two humans share one
  // screen, so "You won!" is ambiguous; we name the winning seat instead. In
  // vs-bot / duel play we speak directly to the player: a win is "You won!"
  // (never their own name), a loss names the victor.
  // Interpolation is delegated to t() with a params object so the placeholder is
  // substituted no matter the brace style — the old manual `.replace('{{name}}', …)`
  // left a literal `{name}` whenever a locale used single braces.
  const isSeated = playerName != null;
  const winnerName = playerWon ? playerLabel : botLabel;
  const label = isTie
    ? t('wordcraft.tied')
    : isSeated
      ? t('wordcraft.opponentWon', { name: winnerName })
      : playerWon
        ? t('wordcraft.youWon', 'You won!')
        : t('wordcraft.opponentWon', { name: botLabel });
  const squares = t('wordcraft.squares', 'squares');
  // Close-game tension: a nail-biter feels different from a blowout. Relative
  // (not absolute) margin so it scales across small/medium/large boards.
  const totalSquares = playerScore + botScore;
  const margin = Math.abs(playerScore - botScore);
  const isCloseGame = !isTie && totalSquares > 0 && margin / totalSquares <= 0.1;

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

        {isCloseGame ? (
          <div className="animate-neo-pop px-3 py-1 bg-neo-orange border-neo-thick border-black text-neo-navy rounded-neo shadow-hard-sm font-neo-display font-black uppercase tracking-wider text-xs">
            🔥 {t('wordcraft.closeGame', 'So close!')}
          </div>
        ) : null}

        {/* Concrete result: how many squares each side controls at the buzzer. */}
        <div className="flex items-stretch gap-3 w-full">
          <div className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 rounded-neo border-neo-thick border-black',
            playerWon ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-navy text-neo-cyan',
          )}>
            <span data-wc-result-avatar className="block">
              <Avatar customAvatar={playerAvatar ?? null} userId={`wc-player-${playerLabel}`} size="sm" disableEffects />
            </span>
            <span className="text-3xl font-neo-display font-black leading-none">{playerScore}</span>
            <span className="text-[10px] font-neo-body uppercase tracking-wider truncate max-w-full px-1">{playerLabel} · {squares}</span>
          </div>
          <div className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 rounded-neo border-neo-thick border-black',
            !playerWon && !isTie ? 'bg-neo-pink text-neo-white' : 'bg-neo-navy text-neo-pink',
          )}>
            <span data-wc-result-avatar className="block">
              <Avatar customAvatar={opponentAvatar ?? null} userId={`wc-opponent-${botLabel}`} size="sm" disableEffects />
            </span>
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

        {/* Challenge-a-friend (beat-my-score duel link). Lives here since the
            in-game topbar affordance was removed — the natural brag moment is
            right after the final score anyway. Solo vs-bot only: hot-seat
            (isSeated) already has an opponent in the room. */}
        {!isSeated && currentSeed != null ? (
          <div className={cn('w-full', challengeIntent && 'animate-neo-pop')}>
            {challengeIntent ? (
              <p className="mb-1.5 text-center text-[12px] font-neo-display font-black uppercase tracking-wider text-neo-lime">
                {t('wordcraft.setup.sendChallengeNow')}
              </p>
            ) : null}
            <WordCraftPlayFriendControl
              t={t}
              seed={currentSeed}
              playerScore={playerScore}
              locale={currentLocale ?? 'en'}
              challengerName={challengerName}
              challengerAvatar={challengerAvatar}
              dims={currentDims}
              difficulty={currentDifficulty}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
