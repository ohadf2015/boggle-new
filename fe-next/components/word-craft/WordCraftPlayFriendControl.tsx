'use client';

import { useState } from 'react';
import { Users, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { buildDuelShareData, performDuelShare } from '@/lib/word-craft/duelShare';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { BotDifficulty } from '@/lib/word-craft/botDifficulty';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface Props {
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  seed: number;
  playerScore: number;
  locale: string;
  /** Disable the control (e.g., during gameplay before game-over) */
  disabled?: boolean;
  /** Challenger display name to embed in the invite (from the auth profile). */
  challengerName?: string;
  /** Challenger avatar to embed, so the invitee sees who they're dueling. */
  challengerAvatar?: CustomAvatarConfig;
  /** Board dims this device played — embedded so the invitee gets the same board. */
  dims?: BoardDims;
  /** Bot difficulty this device played — embedded so the bot is equal on both ends. */
  difficulty?: BotDifficulty;
}

export function WordCraftPlayFriendControl({ t, seed, playerScore, locale, disabled, challengerName, challengerAvatar, dims, difficulty }: Props) {
  const [sharing, setSharing] = useState(false);

  const handlePassAndPlay = () => {
    if (typeof window === 'undefined') return;
    // Navigate to current page with ?vs=human appended, preserving locale and seed
    const url = new URL(window.location.href);
    url.searchParams.set('vs', 'human');
    window.location.href = url.toString();
  };

  const handleInviteFriend = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      // Prefer the authenticated profile identity (passed from PageClient); fall
      // back to the legacy localStorage name, then the generic challenger label.
      const username = challengerName
        || (typeof window !== 'undefined' ? localStorage.getItem('wordcraft-duel-name') : null)
        || t('wordcraft.duel.unnamedChallenger');

      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';

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
    <div className="flex flex-col gap-2 px-3 py-2 bg-neo-navy-light border-2 border-neo-pink rounded-neo shadow-hard-sm">
      <div className="flex items-center gap-2 text-xs font-neo-display text-neo-pink uppercase tracking-wide">
        <Users className="w-4 h-4" />
        {t('wordcraft.duel.playFriend')}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handlePassAndPlay}
          disabled={disabled}
          className="flex-1 h-9 text-xs bg-neo-cyan hover:bg-neo-cyan/90 border-2 border-black text-neo-navy font-neo-display font-black uppercase px-2 shadow-hard"
          variant="default"
        >
          {t('wordcraft.duel.passPlay')}
        </Button>
        <Button
          onClick={handleInviteFriend}
          disabled={disabled || sharing}
          className="flex-1 h-9 gap-1 text-xs bg-neo-pink hover:bg-neo-pink/90 border-2 border-black text-neo-white font-neo-display font-black uppercase px-2 shadow-hard"
          variant="default"
        >
          <Share2 className="w-3 h-3" />
          {t('wordcraft.duel.challengeFriend')}
        </Button>
      </div>
    </div>
  );
}
