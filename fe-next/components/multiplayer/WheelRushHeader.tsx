'use client';

import React, { useMemo } from 'react';
import { Crown, X, Zap } from 'lucide-react';
import { GameTimerBar, HUD_EXIT_BUTTON, HUD_EXIT_BUTTON_CLASSROOM } from '@/components/game/hud/GameHud';
import { MpRoundMute } from '@/components/multiplayer/round/MpRoundMute';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { selectClosestRival } from '@/lib/wheelRush/closestRival';
import { useClassroomBoard } from '@/components/education/live/classroomBoard';
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
  /** Total match duration in seconds — drives the CircularTimer ring fill. */
  totalTime?: number | null;
  onQuit: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

/** Relative progress bar (score / leader's score). Hidden during fog so it can't leak masked scores. */
export const WheelRushHeader: React.FC<Props> = ({ leaderboard, username, fogActive, remainingTime, totalTime, onQuit, t }) => {
  const classroom = useClassroomBoard();
  const self = useMemo(() => leaderboard.find(p => p.username === username), [leaderboard, username]);
  // Surface a SINGLE rival — the opponent nearest in score — so the player
  // focuses on one head-to-head instead of scanning a crowded rail.
  const opponents = useMemo(() => {
    const rival = selectClosestRival(leaderboard, username);
    return rival ? [rival] : [];
  }, [leaderboard, username]);
  const maxScore = useMemo(() => leaderboard.reduce((m, p) => Math.max(m, p.score), 0), [leaderboard]);
  const leaderScore = Math.max(maxScore, 1);
  const selfScore = self?.score ?? 0;
  const isLeader = selfScore >= maxScore && maxScore > 0;
  const rival = opponents[0];
  // Near-miss tension: flag when self and the closest rival are within 8% of
  // the leader score. Hidden during fog so the pulse can't leak proximity.
  const isCloseRace = !fogActive && maxScore > 0 && !!rival && Math.abs(selfScore - rival.score) / leaderScore <= 0.08;

  const timerDuration = Math.max(1, totalTime ?? Math.max(remainingTime ?? 0, 90));

  return (
    <div className="flex flex-col gap-2 shrink-0 pt-[env(safe-area-inset-top)] w-full max-w-2xl mx-auto">
      <div data-testid="wheel-hud-row" className="flex h-14 items-center gap-2.5">
        <button type="button" data-testid="wheel-rush-leave" onClick={onQuit} aria-label={t('common.quit')} className={classroom ? HUD_EXIT_BUTTON_CLASSROOM : HUD_EXIT_BUTTON}>
          <X className="h-5 w-5" strokeWidth={3} aria-hidden />
        </button>
        {typeof remainingTime === 'number' ? (
          <div data-testid="wheel-rush-timer" className="flex min-w-0 flex-1">
            <GameTimerBar remaining={Math.max(0, remainingTime)} total={timerDuration} />
          </div>
        ) : <div className="flex-1" />}
        <span
          data-testid="wheel-self-badge"
          className={cn(
            'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border-2 bg-neo-lime ps-1 pe-3 text-neo-black shadow-[0_3px_0_rgb(var(--neo-black))]',
            isCloseRace ? 'border-neo-orange motion-safe:animate-pulse' : 'border-neo-black',
          )}
        >
          <span data-testid="wheel-self-avatar" className="shrink-0">
            <Avatar pixelSize={28} customAvatar={self?.avatar?.customAvatar} userId={username} disableEffects className="rounded-full" />
          </span>
          {isLeader && <Crown className="h-3.5 w-3.5" aria-hidden />}
          {isCloseRace && (
            <Zap data-testid="wheel-close-race-indicator" aria-label={t('wordWheel.closeRace')} className="h-3.5 w-3.5 text-neo-orange motion-safe:animate-pulse" />
          )}
          <span dir="auto" translate="no" className="notranslate sr-only">{self?.username ?? username}</span>
          <span data-testid="wheel-self-score" translate="no" className="notranslate font-neo-display text-xl font-bold leading-none tabular-nums">
            {selfScore}
          </span>
        </span>
        <MpRoundMute />
      </div>

      {/* The one rival nearest in score, as a slim chip under the HUD. */}
      <div data-testid="wheel-opponent-rail" className="flex justify-center">
        {opponents.map(p => {
          const connected = p.presenceStatus ? p.presenceStatus === 'active' : true;
          return (
            <div
              key={p.username}
              data-testid={`wheel-opp-${p.username}`}
              className={cn(
                classroom ? 'flex max-w-full items-center gap-2 rounded-full border-2 bg-edu-surface py-1 ps-1 pe-3 shadow-[0_3px_0_rgb(var(--neo-black))]' : 'flex max-w-full items-center gap-2 rounded-full border-2 bg-neo-navy-light py-1 ps-1 pe-3 shadow-[0_3px_0_rgb(var(--neo-black))]',
                isCloseRace && p.username === rival?.username ? 'border-neo-orange motion-safe:animate-pulse' : 'border-neo-black',
              )}
            >
              <span data-testid={`wheel-opp-avatar-${p.username}`} className="relative shrink-0">
                <Avatar pixelSize={24} customAvatar={p.avatar?.customAvatar} userId={p.username} disableEffects className="rounded-full" />
                <span className={cn('absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full border border-neo-black', connected ? 'bg-neo-lime' : classroom ? 'bg-edu-ink/30' : 'bg-neo-cream/30')} />
              </span>
              <span dir="auto" translate="no" className={classroom ? 'notranslate min-w-0 truncate font-neo-display text-sm font-bold text-edu-ink' : 'notranslate min-w-0 truncate font-neo-display text-sm font-bold text-neo-white'}>{p.username}</span>
              {fogActive ? (
                <span className={classroom ? 'font-neo-display text-sm font-black tracking-wider text-edu-cyan-ink' : 'font-neo-display text-sm font-black tracking-wider text-neo-cyan'}>???</span>
              ) : (
                <span translate="no" className={classroom ? 'notranslate font-neo-display text-sm font-black tabular-nums text-edu-ink' : 'notranslate font-neo-display text-sm font-black tabular-nums text-neo-white'}>{p.score}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WheelRushHeader;
