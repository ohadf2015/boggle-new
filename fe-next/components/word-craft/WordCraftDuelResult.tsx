'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import { buildDuelShareData, performDuelShare } from '@/lib/word-craft/duelShare';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { BotDifficulty } from '@/lib/word-craft/botDifficulty';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface Props {
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  playerScore: number;
  duelOutcome: {
    outcome: 'win' | 'lose' | 'tie';
    challengerName: string;
    challengerScore: number;
    /** The challenger's avatar, decoded from the duel link (seeded fallback if absent). */
    challengerAvatar?: CustomAvatarConfig;
  };
  /** Current game seed for building the outgoing duel link */
  currentSeed?: number;
  /** Current locale for building the outgoing duel link */
  currentLocale?: string;
  /** This player's display name for the outgoing re-challenge link (from auth profile). */
  challengerName?: string;
  /** This player's avatar for the outgoing re-challenge link. */
  challengerAvatar?: CustomAvatarConfig;
  /** Board dims this player just played — embedded in the re-challenge link. */
  dims?: BoardDims;
  /** Bot difficulty this player just played — embedded in the re-challenge link. */
  difficulty?: BotDifficulty;
  /** Re-roll a fresh solo game in place (escapes the duel). */
  onPlayAgain?: () => void;
  /** Leave to the home/menu screen. */
  onHome?: () => void;
}

export function WordCraftDuelResult({ t, playerScore, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar, dims, difficulty, onPlayAgain, onHome }: Props) {
  const [sharing, setSharing] = useState(false);

  const outcomeColor = {
    win: 'bg-neo-lime text-neo-navy',
    lose: 'bg-neo-pink text-neo-white',
    tie: 'bg-neo-cyan text-neo-navy',
  }[duelOutcome.outcome];

  const outcomeLabel = {
    win: t('wordcraft.duel.youWin'),
    lose: t('wordcraft.duel.youLose'),
    tie: t('wordcraft.duel.tie'),
  }[duelOutcome.outcome];

  const handleShareChallenge = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      // Prefer the authenticated profile identity; fall back to the legacy
      // localStorage name, then the generic challenger label.
      const username = challengerName
        || (typeof window !== 'undefined' ? localStorage.getItem('wordcraft-duel-name') : null)
        || t('wordcraft.duel.unnamedChallenger');

      // Build the duel URL using the actual current game seed
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';
      const locale = currentLocale || (typeof window !== 'undefined' ? document.documentElement.lang : 'en') || 'en';
      const seed = currentSeed ?? 0;

      const data = buildDuelShareData(
        origin,
        locale,
        { seed, name: username, score: playerScore, avatar: challengerAvatar, dims, difficulty },
        t('wordcraft.duel.shareText', { score: playerScore }),
        t('wordcraft.duel.shareTitleChallenge'),
      );

      await performDuelShare(data, {
        onCopied: () => toast.success(t('wordcraft.duel.linkCopied')),
        onCopyFailed: () => toast.error(t('wordcraft.duel.linkCopyFailed')),
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-[140px] z-40 flex flex-col items-center gap-3">
      {/* Challenger header */}
      <div className="text-xs font-neo-display text-neo-white/70 uppercase tracking-wider">
        {t('wordcraft.duel.vsChallenger', { name: duelOutcome.challengerName })}
      </div>

      {/* Score comparison */}
      <div className="flex gap-3 items-center">
        <div className="flex flex-col items-center gap-1">
          <div className="text-2xl font-neo-display font-black text-neo-white">{playerScore}</div>
          <div className="text-xs font-neo-body text-neo-white/60">{t('wordcraft.you')}</div>
        </div>
        <div className="text-neo-white/40">vs</div>
        <div className="flex flex-col items-center gap-1">
          <Avatar
            customAvatar={duelOutcome.challengerAvatar ?? null}
            userId={duelOutcome.challengerName || 'challenger'}
            size="md"
            disableEffects
          />
          <div className="text-2xl font-neo-display font-black text-neo-white/70">{duelOutcome.challengerScore}</div>
          <div className="text-xs font-neo-body text-neo-white/60">{duelOutcome.challengerName}</div>
        </div>
      </div>

      {/* Outcome banner */}
      <div
        role="status"
        className={`px-4 py-3 border-neo-thick border-black text-center rounded-neo shadow-hard-lg font-neo-display font-black uppercase tracking-wider animate-neo-pop ${outcomeColor}`}
      >
        {outcomeLabel}
      </div>

      {/* Share button */}
      <Button
        onClick={handleShareChallenge}
        disabled={sharing}
        className="gap-2 bg-neo-pink hover:bg-neo-pink/90 border-2 border-black text-neo-white font-neo-display font-black uppercase px-4 py-2 shadow-hard"
        variant="default"
      >
        <Share2 className="w-4 h-4" />
        {t('wordcraft.duel.challengeFriend')}
      </Button>

      {/* Replay loop — without these the duel result is a dead-end (you could
          only re-challenge, never start a fresh solo game or go home). */}
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
