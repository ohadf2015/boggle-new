'use client';

import React, { useState } from 'react';
import { Trophy, UserPlus } from 'lucide-react';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { SkeletonRow } from './DailyLeaderboardRow';
import type { LeaderboardTab, T } from './leaderboardTypes';

export function LeaderboardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={`skeleton-${index}`} index={index} />
      ))}
    </div>
  );
}

export function LeaderboardError({ t, onRetry }: { t: T; onRetry: () => void }) {
  return (
    <div className="text-center text-neo-red py-4 text-sm">
      {t('errors.failedToLoadLeaderboard')}
      <button
        type="button"
        onClick={onRetry}
        className="block mx-auto mt-3 px-4 py-1.5 text-xs font-bold uppercase rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm hover:shadow-hard active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}

function InviteFriendButton({ t }: { t: T }) {
  const [copied, setCopied] = useState(false);
  const invite = async () => {
    const outcome = await shareOrCopy({
      text: t('daily.leaderboard.inviteText'),
      url: `${window.location.origin}${window.location.pathname}`,
    });
    if (outcome === 'copy') setCopied(true);
  };
  return (
    <button
      type="button"
      onClick={invite}
      data-testid="leaderboard-invite-friend"
      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-neo border-2 border-neo-black bg-neo-pink text-neo-black text-xs sm:text-sm font-black uppercase tracking-wide shadow-hard-sm hover:-translate-y-px hover:shadow-hard active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow]"
    >
      <UserPlus aria-hidden className="w-4 h-4" />
      {copied ? t('daily.leaderboard.linkCopied') : t('daily.leaderboard.inviteFriend')}
    </button>
  );
}

/**
 * Empty boards say the true thing. Today: when guests solved but could not be
 * ranked, say how many (and why signing in matters); otherwise invite the first.
 */
export function LeaderboardEmpty({ t, tab, solversToday }: { t: T; tab: LeaderboardTab; solversToday: number }) {
  const message = tab === 'friends'
    ? t('leaderboard.noFriendsPlayed')
    : tab === 'season'
      ? t('wordHunt.leaderboard.seasonNoPlayers')
      : tab === 'today'
        ? solversToday > 0
          ? t('daily.guestsSolvedSignIn').replace('{count}', String(solversToday))
          : t('daily.beFirstToPlay')
        : t('wordHunt.leaderboard.noPlayersYet');

  return (
    <div className="text-center py-6" data-testid={`leaderboard-empty-${tab}`}>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-neo-lg bg-neo-purple border-2 border-neo-black shadow-hard-sm">
        <Trophy aria-hidden className="h-7 w-7 text-neo-yellow" />
      </div>
      <p className="text-neo-white/80 font-bold text-sm sm:text-base">{message}</p>
      {tab === 'friends' && <InviteFriendButton t={t} />}
    </div>
  );
}
