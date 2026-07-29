'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import Avatar from '@/components/Avatar';
import { buildDuelUrl } from '@/lib/word-craft/duel';
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
}

export function WordCraftDuelResult({ t, playerScore, duelOutcome, currentSeed, currentLocale, challengerName, challengerAvatar }: Props) {
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

      const duelUrl = buildDuelUrl(origin, locale, {
        seed,
        name: username,
        score: playerScore,
        avatar: challengerAvatar,
      });

      const shareText = t('wordcraft.duel.shareText', { score: playerScore });
      const shareTitle = t('wordcraft.duel.shareTitleChallenge');

      // Try Web Share API first
      if (navigator.share && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: duelUrl,
          });
        } catch (err: unknown) {
          // User cancelled or share failed; fall back to clipboard
          if (err instanceof Error && err.name !== 'AbortError') {
            fallbackToClipboard(duelUrl);
          }
        }
      } else {
        // Fallback to clipboard
        fallbackToClipboard(duelUrl);
      }
    } finally {
      setSharing(false);
    }
  };

  const fallbackToClipboard = (url: string) => {
    try {
      navigator.clipboard.writeText(url).then(() => {
        toast.success(t('wordcraft.duel.linkCopied'));
      }).catch(() => {
        // Silent fail; user can manually copy if needed
      });
    } catch {
      // Clipboard API not available
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
    </div>
  );
}
