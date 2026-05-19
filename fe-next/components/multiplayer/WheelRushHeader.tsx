'use client';

import React, { useMemo } from 'react';
import { Crown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Avatar as AvatarType, PresenceStatus } from '@/shared/types/game';

export interface WheelRushPlayer {
  username: string;
  score: number;
  wordCount?: number;
  avatar?: AvatarType;
  presenceStatus?: PresenceStatus;
}

interface Props {
  leaderboard: WheelRushPlayer[];
  username: string;
  fogActive: boolean;
  remainingTime?: number | null;
  onQuit: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/** Relative progress bar (score / leader's score). Hidden during fog so it can't leak masked scores. */
const ProgressBar: React.FC<{ ratio: number; tone: 'self' | 'opp' }> = ({ ratio, tone }) => (
  <div className="mt-1 h-1.5 w-full rounded-full bg-neo-black/40 overflow-hidden">
    <div
      className={cn('h-full rounded-full transition-[width] duration-500', tone === 'self' ? 'bg-neo-black/70' : 'bg-neo-lime')}
      style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }}
    />
  </div>
);

export const WheelRushHeader: React.FC<Props> = ({ leaderboard, username, fogActive, remainingTime, onQuit, t }) => {
  const self = useMemo(() => leaderboard.find(p => p.username === username), [leaderboard, username]);
  const opponents = useMemo(
    () => leaderboard.filter(p => p.username !== username).sort((a, b) => b.score - a.score).slice(0, 3),
    [leaderboard, username],
  );
  const maxScore = useMemo(() => leaderboard.reduce((m, p) => Math.max(m, p.score), 0), [leaderboard]);
  const leaderScore = Math.max(maxScore, 1);
  const selfScore = self?.score ?? 0;
  const isLeader = selfScore >= maxScore && maxScore > 0;

  return (
    <div className="flex flex-col gap-2 shrink-0 pt-[env(safe-area-inset-top)]">
      {/* Row 1 — opponent progress rail + timer + quit */}
      <div className="flex items-stretch gap-2">
        <div
          data-testid="wheel-opponent-rail"
          className="flex items-stretch gap-1.5 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {opponents.map(p => {
            const connected = p.presenceStatus ? p.presenceStatus === 'active' : true;
            return (
              <div
                key={p.username}
                data-testid={`wheel-opp-${p.username}`}
                className="shrink-0 w-28 px-2 py-1 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span data-testid={`wheel-opp-avatar-${p.username}`} className="relative shrink-0">
                    <Avatar pixelSize={22} customAvatar={p.avatar?.customAvatar} userId={p.username} disableEffects className="rounded-full" />
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full border border-neo-black',
                        connected ? 'bg-neo-lime' : 'bg-neo-cream/30',
                      )}
                    />
                  </span>
                  <span dir="auto" className="font-neo-display font-bold text-[11px] text-neo-cream truncate">{p.username}</span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  {fogActive ? (
                    <span className="font-neo-display font-black text-sm text-neo-cyan tracking-wider">???</span>
                  ) : (
                    <span className="font-neo-display font-black text-sm text-neo-cream tabular-nums">{p.score}</span>
                  )}
                  {!fogActive && (p.wordCount ?? 0) > 0 && (
                    <span className="text-[10px] text-neo-cream/50 tabular-nums">{p.wordCount}w</span>
                  )}
                </div>
                {!fogActive && <ProgressBar ratio={p.score / leaderScore} tone="opp" />}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {typeof remainingTime === 'number' && (
            <div
              data-testid="wheel-rush-timer"
              aria-label={t('wordWheel.timeLeft') || 'Time Left'}
              className={cn(
                'px-2.5 py-1 rounded-neo border-2 border-neo-black font-neo-display font-bold text-xs sm:text-sm shadow-hard tabular-nums',
                remainingTime <= 10 ? 'bg-neo-red text-neo-white animate-pulse' : 'bg-neo-cyan text-neo-black',
              )}
            >
              {Math.floor(Math.max(0, remainingTime) / 60)}:{String(Math.max(0, remainingTime) % 60).padStart(2, '0')}
            </div>
          )}
          <Button size="sm" variant="destructive" onClick={onQuit}>{t('common.quit') || 'Quit'}</Button>
        </div>
      </div>

      {/* Row 2 — prominent self score bar */}
      <div
        data-testid="wheel-self-badge"
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard-lg"
      >
        <span data-testid="wheel-self-avatar" className="shrink-0">
          <Avatar pixelSize={34} customAvatar={self?.avatar?.customAvatar} userId={username} disableEffects className="rounded-full" />
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[11px] font-neo-display font-bold uppercase tracking-wide opacity-70">
            {isLeader && <Crown className="w-3 h-3" />}
            <span dir="auto" className="truncate">{self?.username ?? username}</span>
          </span>
          {!fogActive && <ProgressBar ratio={selfScore / leaderScore} tone="self" />}
        </div>
        <span
          data-testid="wheel-self-score"
          className="font-neo-display font-black text-3xl leading-none tabular-nums shrink-0"
        >
          {selfScore}
        </span>
      </div>
    </div>
  );
};

export default WheelRushHeader;
