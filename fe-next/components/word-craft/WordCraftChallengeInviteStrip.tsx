'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { buildDuelShareData, performDuelShare } from '@/lib/word-craft/duelShare';
import type { BoardDims } from '@/lib/word-craft/boardDimensions';
import type { BotDifficulty } from '@/lib/word-craft/botDifficulty';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface Props {
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  /** Board seed the friend will replay. */
  seed: number;
  /** This player's live score — the number the friend must beat. */
  playerScore: number;
  locale: string;
  /** Challenger display name (from the auth profile). */
  challengerName?: string;
  /** Challenger avatar, embedded so the invitee sees who they're dueling. */
  challengerAvatar?: CustomAvatarConfig;
  /** Board dims this device is playing — embedded so the friend gets the same board. */
  dims?: BoardDims;
  /** Bot difficulty this device is playing — embedded so the bot is equal on both ends. */
  difficulty?: BotDifficulty;
}

/**
 * Sender-side counterpart to WordCraftDuelTargetStrip. When a player picks
 * "Challenge a Friend" at setup, the game is otherwise pixel-identical to a
 * vs-bot game — nothing signals the challenge intent, and the invite was
 * previously buried on the game-over screen (undiscoverable if you quit early).
 *
 * This keeps a persistent, tappable invite present for the whole game so the
 * declared intent has an immediate, visible payoff. The link carries the live
 * score; the game-over control re-shares the final number.
 */
export function WordCraftChallengeInviteStrip({ t, seed, playerScore, locale, challengerName, challengerAvatar, dims, difficulty }: Props) {
  const [sharing, setSharing] = useState(false);

  const handleInvite = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const name = challengerName
        || (typeof window !== 'undefined' ? localStorage.getItem('wordcraft-duel-name') : null)
        || t('wordcraft.duel.unnamedChallenger');
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live';

      const data = buildDuelShareData(
        origin,
        locale,
        { seed, name, score: playerScore, avatar: challengerAvatar, dims, difficulty },
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
    <div className="flex items-center gap-3 px-3 py-2 bg-neo-navy-light border-2 border-neo-pink rounded-neo shadow-hard-sm">
      <Avatar customAvatar={challengerAvatar ?? null} userId={challengerName || 'challenger'} size="md" disableEffects />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-neo-display font-black uppercase tracking-wide text-neo-pink truncate">
          {t('wordcraft.duel.playFriend')}
        </div>
        <div className="text-[11px] font-neo-body text-neo-white/60 truncate">
          {t('wordcraft.duel.inviteHint')}
        </div>
      </div>
      <Button
        onClick={handleInvite}
        disabled={sharing}
        className="shrink-0 h-9 gap-1 text-xs bg-neo-pink hover:bg-neo-pink/90 border-2 border-black text-neo-white font-neo-display font-black uppercase px-3 shadow-hard"
        variant="default"
      >
        <Send className="w-3.5 h-3.5" />
        {t('wordcraft.duel.challengeFriend')}
      </Button>
    </div>
  );
}
