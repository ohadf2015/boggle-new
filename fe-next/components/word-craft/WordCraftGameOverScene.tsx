'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { isReducedMotionPreferred } from '@/utils/accessibility';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/components/word-craft/hooks/useCountUp';
import Avatar from '@/components/Avatar';
import { WordCraftDuelResult } from './WordCraftDuelResult';
import { WordCraftPlayFriendControl } from './WordCraftPlayFriendControl';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { BotDifficulty } from '@/lib/word-craft/botDifficulty';
import type { GameHighlights } from '@/lib/word-craft/gameHighlights';
import type { DailyState } from '@/lib/word-craft/daily';
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
  /** The player's best move + longest word this game. */
  highlights?: GameHighlights;
  /** Set when this game was today's daily board: the streak after recording it. */
  dailyResult?: DailyState | null;
  /** Play-again closure loop — re-rolls a fresh solo game in place. */
  onPlayAgain?: () => void;
  /** Leave to the home/menu screen. */
  onHome?: () => void;
}

export function WordCraftGameOverScene({ t, playerScore, botScore, playerName, botName, isNewBest, playerAvatar, opponentAvatar, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar, currentDims, currentDifficulty, challengeIntent, highlights, dailyResult, onPlayAgain, onHome }: Props) {
  const heroRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!heroRef.current || isReducedMotionPreferred()) return;
    const tween = gsap.fromTo(
      heroRef.current,
      { y: -90, rotation: -14, scale: 0.4, opacity: 0 },
      { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.9, delay: 0.1, ease: 'elastic.out(1, 0.5)' },
    );
    return () => {
      tween.kill();
    };
  }, []);
  const shownPlayer = useCountUp(playerScore);
  const shownBot = useCountUp(botScore);
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
  // Blowout-win surprise: the opposite extreme from close-game tension — a
  // rare escalated payoff so a dominant win feels like MORE than just a win.
  const isBlowout = playerWon && totalSquares > 0 && margin / totalSquares >= 0.6;

  // Full-screen modal: a small bottom banner was easy to miss, so players were
  // unsure the game had actually ended. A dim backdrop + centered card makes the
  // finish unmistakable and puts the result (square counts) + next action front
  // and center.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wordcraft.gameOver', 'Game over')}
      className="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain p-4 bg-black/80 animate-neo-pop"
    >
      <div className="relative m-auto w-full max-w-sm flex flex-col items-center gap-3 [@media(min-height:860px)]:gap-4 bg-neo-navy-light border-neo-thick border-black rounded-neo shadow-hard-lg p-6">
        <span className="text-[11px] font-neo-display font-black uppercase tracking-[0.2em] text-neo-white/70">
          {t('wordcraft.gameOver', 'Game over')}
        </span>

        {playerWon || !isTie ? (
          <span ref={heroRef} className="block -my-1">
            <Image
              src={playerWon ? '/word-craft/trophy.webp' : '/word-craft/bot.webp'}
              alt=""
              width={512}
              height={510}
              priority
              className="wc-float w-20 [@media(min-height:860px)]:w-28 h-auto drop-shadow-[0_6px_0_rgba(0,0,0,0.6)]"
            />
          </span>
        ) : null}

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

        {isBlowout ? (
          <div className="animate-neo-pop scale-110 px-3 py-1 bg-neo-yellow border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider text-xs">
            👑 {t('wordcraft.domination', 'Domination!')}
          </div>
        ) : null}

        {/* Concrete result: how many squares each side controls at the buzzer. */}
        <div className="wc-rise flex items-stretch gap-3 w-full" style={{ '--wc-delay': '120ms' } as React.CSSProperties}>
          <div className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 rounded-neo border-neo-thick border-black',
            playerWon ? 'bg-neo-cyan text-neo-navy' : 'bg-neo-navy text-neo-cyan',
          )}>
            <span data-wc-result-avatar className="block">
              <Avatar customAvatar={playerAvatar ?? null} userId={`wc-player-${playerLabel}`} size="sm" disableEffects />
            </span>
            <span className="text-3xl font-neo-display font-black leading-none tabular-nums">{shownPlayer}</span>
            <span className="text-[10px] font-neo-body uppercase tracking-wider truncate max-w-full px-1">{playerLabel} · {squares}</span>
          </div>
          <div className={cn(
            'flex-1 flex flex-col items-center gap-1 py-3 rounded-neo border-neo-thick border-black',
            !playerWon && !isTie ? 'bg-neo-pink text-neo-white' : 'bg-neo-navy text-neo-pink',
          )}>
            <span data-wc-result-avatar className="block">
              <Avatar customAvatar={opponentAvatar ?? null} userId={`wc-opponent-${botLabel}`} size="sm" disableEffects />
            </span>
            <span className="text-3xl font-neo-display font-black leading-none tabular-nums">{shownBot}</span>
            <span className="text-[10px] font-neo-body uppercase tracking-wider truncate max-w-full px-1">{botLabel} · {squares}</span>
          </div>
        </div>

        {dailyResult ? (
          <div
            data-wc-daily-result
            className="wc-rise w-full flex items-center gap-3 px-3 py-2 rounded-neo border-neo-thick border-black bg-neo-orange text-neo-navy shadow-hard"
            style={{ '--wc-delay': '240ms' } as React.CSSProperties}
          >
            <Image src="/word-craft/flame.webp" alt="" width={302} height={384} className="h-10 w-auto wc-flicker" />
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-neo-display font-black uppercase tracking-wide leading-tight">{t('wordcraft.daily.streakNow', { n: dailyResult.streak })}</span>
              <span className="text-[11px] font-neo-body font-bold opacity-80">{t('wordcraft.daily.tomorrow')}</span>
            </span>
          </div>
        ) : null}

        {highlights?.bestMove ? (
          <div className="w-full grid grid-cols-2 gap-2">
            <HighlightChip delay={300} label={t('wordcraft.highlights.best')} word={highlights.bestMove.word} sub={t('wordcraft.highlights.pts', { n: highlights.bestMove.score })} />
            {highlights.longestWord ? (
              <HighlightChip delay={380} label={t('wordcraft.highlights.longest')} word={highlights.longestWord} sub={`${highlights.longestWord.length}`} />
            ) : null}
          </div>
        ) : null}

        {(onPlayAgain || onHome) ? (
          <div className="flex items-stretch gap-2 w-full">
            {onPlayAgain ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex-1 flex items-center justify-center text-center px-3 py-2.5 bg-neo-lime border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
              >
                ↻ {t('wordcraft.playAgain')}
              </button>
            ) : null}
            {onHome ? (
              <button
                type="button"
                onClick={onHome}
                className="flex-1 flex items-center justify-center text-center px-3 py-2.5 bg-neo-cyan border-neo-thick border-black text-neo-navy rounded-neo shadow-hard font-neo-display font-black uppercase tracking-wider active:animate-neo-press hover:-translate-y-0.5 transition-transform"
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

function HighlightChip({ label, word, sub, delay }: { label: string; word: string; sub: string; delay: number }) {
  return (
    <div
      className="wc-rise flex items-center gap-2 px-2 py-1.5 rounded-neo border-neo-thick border-black bg-neo-navy text-neo-white min-w-0"
      style={{ '--wc-delay': `${delay}ms` } as React.CSSProperties}
    >
      <Image src="/word-craft/gem.webp" alt="" width={345} height={384} className="h-8 w-auto shrink-0" />
      <span className="flex flex-col min-w-0">
        <span className="text-[9px] font-neo-body uppercase tracking-wider text-neo-white/60 truncate">{label}</span>
        <span className="text-sm font-neo-display font-black uppercase leading-tight truncate">{word}</span>
        <span className="text-[10px] font-neo-body text-neo-cyan">{sub}</span>
      </span>
    </div>
  );
}
