'use client';

import { memo } from 'react';
import { Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';

export interface WordCraftDuelTargetStripProps {
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  /** Challenger's display name (decoded from the duel link). */
  friendName: string;
  /** Challenger's final score — the target to beat. */
  friendScore: number;
  /** This player's live score. */
  playerScore: number;
  /** Challenger's avatar (seeded fallback derived from the name if absent). */
  friendAvatar?: CustomAvatarConfig;
}

/**
 * In-duel "who you're up against" strip. A duel is async (the friend already
 * played the same seed), so they can't appear on the board — but their identity
 * shouldn't be invisible. This keeps the friend's avatar + name + target score
 * present for the whole game, with a live "X to go / ahead by Y" readout so the
 * race against their number stays legible. The on-board bot remains the live
 * sparring opponent that keeps Territory contested and fair.
 */
function WordCraftDuelTargetStripImpl({ t, friendName, friendScore, playerScore, friendAvatar }: WordCraftDuelTargetStripProps) {
  const diff = playerScore - friendScore;
  const ahead = diff > 0;
  const tied = diff === 0;
  const statusText = tied
    ? t('wordcraft.duel.tiedNow')
    : ahead
      ? t('wordcraft.duel.aheadBy', { n: diff })
      : t('wordcraft.duel.toGo', { n: -diff });
  const statusTone = tied ? 'text-neo-cyan' : ahead ? 'text-neo-lime' : 'text-neo-pink';

  return (
    <div
      role="status"
      data-duel-status={tied ? 'tied' : ahead ? 'ahead' : 'behind'}
      className="flex items-center gap-3 px-3 py-2 bg-neo-navy-light border-2 border-neo-pink rounded-neo shadow-hard-sm"
    >
      <Avatar
        customAvatar={friendAvatar ?? null}
        userId={friendName || 'challenger'}
        size="md"
        mode="multiplayer"
        disableEffects
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-xs font-neo-display font-black uppercase tracking-wide text-neo-pink truncate">
          <Swords className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="truncate">{t('wordcraft.duel.vsChallenger', { name: friendName })}</span>
        </div>
        <div className={cn('text-xs font-neo-display font-black uppercase tracking-wider', statusTone)}>
          {statusText}
        </div>
      </div>
      <div className="flex flex-col items-end leading-none">
        <span className="font-neo-display font-black text-2xl text-neo-white tabular-nums">{friendScore}</span>
        <span className="text-[9px] font-neo-body uppercase tracking-wider text-neo-white/50">
          {t('wordcraft.duel.theirScore')}
        </span>
      </div>
    </div>
  );
}

export const WordCraftDuelTargetStrip = memo(WordCraftDuelTargetStripImpl);
