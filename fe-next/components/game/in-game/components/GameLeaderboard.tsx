'use client';

import { memo, useMemo, useRef, useEffect, useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Trophy, Crown, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useReactiveAvatarMood } from '@/hooks/useReactiveAvatarMood';
import { moodToOverlay } from '@/lib/avatar/avatarOverlay';
import { getAvatarTrait } from '@/lib/avatar/avatarPersonality';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import PresenceIndicator from '@/components/PresenceIndicator';
import { getRankStyle, getRankIconString } from '@/utils/rankingStyles';
import { useLiveScoreFor } from '@/hooks/gameState/selectors';
import { cn } from '@/lib/utils';
import type { ExtendedLeaderboardPlayer as LeaderboardPlayer } from '@/shared/types/view';
import type { TranslationFn } from '../types';

/**
 * The hero score number, subscribed live to the store rather than the (frozen)
 * row prop. The row body is intentionally held still by useFrozenWhileSelecting
 * while the local player drags — but rival scores must keep ticking, so the
 * number reads the live store value and only falls back to the frozen prop
 * snapshot when the store has no row yet (e.g. unit tests / first paint).
 */
function LiveScore({ username, fallback }: { username: string; fallback: number }) {
  const live = useLiveScoreFor(username);
  return <div className="text-lg font-black leading-none tabular-nums">{live ?? fallback}</div>;
}

interface GameLeaderboardProps {
  leaderboard: LeaderboardPlayer[];
  username: string;
  isHost: boolean;
  t: TranslationFn;
  dir: 'rtl' | 'ltr';
  /** Tighter rendering for the mobile in-game split view (smaller border, no
   *  slide-in). Defaults to the full desktop sidebar styling. */
  compact?: boolean;
}

interface MemoizedLeaderboardPlayer extends LeaderboardPlayer {
  rankStyle: string;
  isMe: boolean;
  rankDisplay: string;
  index: number;
}

interface LeaderboardRowProps {
  player: MemoizedLeaderboardPlayer;
  isHost: boolean;
  dir: 'rtl' | 'ltr';
  t: TranslationFn;
  rankChange: number; // positive = moved up, negative = moved down
  scoreChange: number;
}

/** Combo badge thresholds and styling */
function getComboInfo(level: number): { label: string; className: string } | null {
  if (level >= 15) return { label: `${level}x`, className: 'bg-linear-to-r from-fuchsia-500 to-pink-500 text-white animate-pulse' };
  if (level >= 10) return { label: `${level}x`, className: 'bg-linear-to-r from-red-500 to-orange-500 text-white' };
  if (level >= 5) return { label: `${level}x`, className: 'bg-linear-to-r from-amber-400 to-yellow-300 text-neo-black' };
  if (level >= 3) return { label: `${level}x`, className: 'bg-neo-cyan text-neo-black' };
  return null;
}

/**
 * LeaderboardRow - Memoized individual row with dynamic features
 *
 * Shows combo badges, score deltas, and rank change arrows.
 * Uses CSS transitions for smooth visual updates.
 */
const LeaderboardRow = memo<LeaderboardRowProps>(function LeaderboardRow({
  player,
  isHost: _isHost,
  dir,
  t,
  rankChange,
  scoreChange,
}) {
  const comboInfo = getComboInfo(player.comboLevel || 0);
  const [showScoreDelta, setShowScoreDelta] = useState(false);

  // Live face-swap reactions: scoring → celebrate, overtaken → flinch, on a
  // streak → flame eyes. Keyed on absolute score/rank inside the hook so equal
  // back-to-back deltas still fire (see useReactiveAvatarMood).
  const avatarMood = useReactiveAvatarMood({
    score: player.score,
    rank: player.index,
    scoreChange,
    rankChange,
    comboLevel: player.comboLevel ?? 0,
    // Deterministic per-player personality — same player reacts the same way
    // every game (smug flexes, chaotic clowns, stoic stays cool).
    trait: getAvatarTrait(player.username),
  });

  // Flash score delta briefly when score changes
  useEffect(() => {
    if (scoreChange > 0) {
      setShowScoreDelta(true);
      const id = setTimeout(() => setShowScoreDelta(false), 1500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [scoreChange]);

  return (
    <div
      role="listitem"
      tabIndex={0}
      data-current-player={player.isMe ? 'true' : 'false'}
      className={cn(
        `flex items-center gap-2 p-1.5 rounded-neo border-3 shadow-hard-sm transition-all duration-300
        hover:-translate-x-px hover:-translate-y-px hover:shadow-hard
        focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-1`,
        dir === 'rtl' && 'flex-row-reverse',
        // The current player's row gets an unmistakable solid cyan fill + bold
        // ring/offset so it stands out from the gold/silver/bronze rank rows at
        // a glance. Rivals keep their rank-coloured styling.
        player.isMe
          ? 'bg-neo-cyan text-neo-black border-neo-black ring-3 ring-neo-cyan ring-offset-2 ring-offset-neo-cream relative z-10 shadow-hard'
          : player.rankStyle,
      )}
    >
      {/* Rank badge with change indicator */}
      <div className="relative shrink-0">
        <div className="w-7 h-7 rounded-neo flex items-center justify-center font-black text-sm bg-neo-black text-neo-white border-2 border-neo-black">
          {player.rankDisplay}
        </div>
        {/* Rank change arrow */}
        {rankChange !== 0 && (
          <div className={`absolute -top-1.5 -inset-e-1.5 w-4 h-4 rounded-full flex items-center justify-center
            ${rankChange > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
          >
            {rankChange > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          </div>
        )}
      </div>

      {/* Avatar */}
      <Avatar
        customAvatar={player.avatar?.customAvatar ?? undefined}
        avatarImage={player.avatar?.avatarImage}
        size="md"
        disableEffects tierMarker
        mood={avatarMood}
        overlay={moodToOverlay(avatarMood)}
      />

      {/* Name — single line; the crown is the host marker (no extra chip). */}
      <div className={`flex-1 min-w-0 flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {player.isHost && (
          <Crown
            aria-label="Host"
            className="w-3.5 h-3.5 text-neo-black shrink-0 drop-shadow-[1px_1px_0px_rgb(var(--neo-white))]"
          />
        )}
        <PlayerProfileTooltip
          player={{
            username: player.username,
            avatarImage: player.avatar?.avatarImage,
            customAvatar: player.avatar?.customAvatar,
            score: player.score,
          }}
          isCurrentUser={player.isMe}
          side="left"
        >
          <span className={`truncate font-black text-sm text-neo-black ${!player.isMe ? 'cursor-pointer hover:underline' : ''}`} title={player.username}>
            {player.username}
          </span>
        </PlayerProfileTooltip>
        {player.isMe && (
          <span className="text-[10px] bg-neo-black text-neo-cyan px-1.5 py-0.5 rounded-neo font-black uppercase tracking-wide shrink-0">
            {t('playerView.me')}
          </span>
        )}
      </div>

      {/* Combo (only when active) + presence + the score as the hero number */}
      <div className={`flex items-center gap-1.5 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        {comboInfo && (
          <span className={`text-[9px] font-black px-1 py-0.5 rounded-neo flex items-center gap-0.5 ${comboInfo.className}`}>
            <Flame className="w-2.5 h-2.5" />
            {comboInfo.label}
          </span>
        )}
        {!player.isMe && player.presenceStatus && (
          <PresenceIndicator
            status={player.presenceStatus}
            isWindowFocused={player.isWindowFocused}
            size="md"
          />
        )}
        <div className="relative">
          {/* Score delta floating */}
          {showScoreDelta && scoreChange > 0 && (
            <div className="absolute -top-3 inset-e-0 text-[10px] font-black text-neo-lime animate-bounce">
              +{scoreChange}
            </div>
          )}
          <div className="bg-neo-black text-neo-white rounded-neo px-2.5 py-1 min-w-[44px] text-center border-2 border-neo-black">
            <LiveScore username={player.username} fallback={player.score} />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * GameLeaderboard - Dynamic desktop leaderboard sidebar
 *
 * Features:
 * - Live combo badges (3x/5x/10x/15x+)
 * - Score delta flash on point gain
 * - Rank change arrows when positions swap
 * - Highlighted "me" row with cyan ring
 */
export const GameLeaderboard = memo<GameLeaderboardProps>(function GameLeaderboard({
  leaderboard,
  username,
  isHost,
  t,
  dir,
  compact = false,
}) {
  // Track previous scores and ranks for change detection
  const prevDataRef = useRef<Map<string, { rank: number; score: number }>>(new Map());

  // "Your standing" cue — the single live leaderboard now carries the
  // motivational signal the old race-track panel used to: am I leading (and by
  // how much), or how many points do I need to pass the player right above me.
  // `leaderboard` arrives pre-sorted (rank === index), so neighbours are direct.
  const youStanding = useMemo(() => {
    const myIndex = leaderboard.findIndex((p) => p.username === username);
    if (myIndex === -1 || leaderboard.length < 2) return null;
    if (myIndex === 0) {
      const gap = leaderboard[0].score - (leaderboard[1]?.score ?? 0);
      return { leading: true as const, gap };
    }
    const target = leaderboard[myIndex - 1];
    const toCatch = Math.max(1, target.score - leaderboard[myIndex].score + 1);
    return { leading: false as const, toCatch };
  }, [leaderboard, username]);

  const memoizedLeaderboard: MemoizedLeaderboardPlayer[] = useMemo(
    () =>
      leaderboard.map((player, index) => ({
        ...player,
        rankStyle: getRankStyle(index),
        isMe: player.username === username,
        rankDisplay: getRankIconString(index),
        index,
      })),
    [leaderboard, username]
  );

  // Compute rank and score changes
  const changes = useMemo(() => {
    const map = new Map<string, { rankChange: number; scoreChange: number }>();
    for (const player of memoizedLeaderboard) {
      const prev = prevDataRef.current.get(player.username);
      const rankChange = prev ? prev.rank - player.index : 0; // positive = moved up
      const scoreChange = prev ? player.score - prev.score : 0;
      map.set(player.username, { rankChange, scoreChange });
    }
    return map;
  }, [memoizedLeaderboard]);

  // Update previous data after render
  useEffect(() => {
    const newMap = new Map<string, { rank: number; score: number }>();
    for (const player of memoizedLeaderboard) {
      newMap.set(player.username, { rank: player.index, score: player.score });
    }
    prevDataRef.current = newMap;
  }, [memoizedLeaderboard]);

  return (
    <AdaptiveMotion.div
      className={cn(
        'bg-neo-cream text-neo-black border-neo-black rounded-neo-lg shadow-hard-lg flex flex-col overflow-hidden relative',
        compact ? 'border-3' : 'border-4 max-h-[45vh] lg:max-h-[50vh] lg:shrink',
      )}
      initial={compact ? false : { x: 50, opacity: 0 }}
      animate={compact ? undefined : { x: 0, opacity: 1 }}
      transition={compact ? undefined : { delay: 0.2 }}
    >
      {/* Header */}
      <div className={cn('border-b-4 border-neo-black bg-neo-pink text-white', compact ? 'py-1.5 px-3' : 'py-2.5 px-4')}>
        <h3 className={cn('flex items-center gap-2 text-neo-white uppercase tracking-widest font-black', compact ? 'text-xs' : 'text-sm')}>
          <Trophy className="w-4 h-4 text-neo-lime shrink-0" />
          <span className="truncate">{t('playerView.leaderboard')}</span>
          <span className="ms-auto text-[10px] font-bold text-neo-white tabular-nums whitespace-nowrap shrink-0">
            {t('mp.rivals.playersCount', { n: leaderboard.length })}
          </span>
        </h3>
      </div>

      {/* Your standing — leading by N / N points to catch the player above. */}
      {youStanding && (
        <div
          data-testid="leaderboard-you-status"
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-1 border-b-2 border-neo-black font-black uppercase tracking-wide',
            compact ? 'text-[10px]' : 'text-xs',
            youStanding.leading ? 'bg-neo-lime text-neo-black' : 'bg-neo-cyan/15 text-neo-black',
          )}
        >
          {youStanding.leading ? (
            <>
              <Flame className="w-3.5 h-3.5 text-neo-pink shrink-0" />
              <span>{t('leaderboard.leading')}</span>
              {youStanding.gap > 0 && (
                <span className="tabular-nums text-neo-black/70">
                  +{youStanding.gap} {t('leaderboard.ahead')}
                </span>
              )}
            </>
          ) : (
            <>
              <TrendingUp className="w-3.5 h-3.5 text-neo-cyan shrink-0" />
              <span className="tabular-nums">+{youStanding.toCatch}</span>
              <span>{t('leaderboard.toCatch')}</span>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn('p-2.5', compact ? 'overflow-y-auto custom-scrollbar' : 'overflow-y-auto flex-1 custom-scrollbar')}>
        <div className="space-y-1.5" role="list">
          {memoizedLeaderboard.map((player) => {
            const change = changes.get(player.username);
            return (
              <LeaderboardRow
                key={player.username}
                player={player}
                isHost={isHost}
                dir={dir}
                t={t}
                rankChange={change?.rankChange ?? 0}
                scoreChange={change?.scoreChange ?? 0}
              />
            );
          })}

          {leaderboard.length === 0 && (
            <p className="text-center text-neo-black/90 py-6 text-sm font-bold">
              {t('hostView.waitingForPlayers')}
            </p>
          )}
        </div>
      </div>
    </AdaptiveMotion.div>
  );
});
