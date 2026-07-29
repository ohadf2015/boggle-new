/**
 * WordHuntPlayerLives
 * Shows other players' life bars as compact indicators in Word Hunt mode.
 * Uses smooth CSS transitions and a subtle pulse glow when life drops low.
 * Now includes player avatars for visual identification.
 */

'use client';

import React, { memo, useRef, useEffect, useState } from 'react';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarType } from '@/shared/types/game';

interface WordHuntPlayerLivesProps {
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  currentPlayer: string;
  /** Avatar data keyed by username, sourced from leaderboard */
  playerAvatars?: Record<string, AvatarType | undefined>;
}

/**
 * Single player life row — memoised so only the player whose life changed re-renders.
 */
const PlayerLifeRow = memo<{
  player: string;
  life: number;
  isEliminated: boolean;
  avatar?: AvatarType;
}>(function PlayerLifeRow({ player, life, isEliminated, avatar }) {
  const percentage = Math.min(100, Math.max(0, life));
  const prevLifeRef = useRef(percentage);
  const [flash, setFlash] = useState(false);

  // Flash on damage
  useEffect(() => {
    if (percentage < prevLifeRef.current) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 400);
      prevLifeRef.current = percentage;
      return () => clearTimeout(id);
    }
    prevLifeRef.current = percentage;
    return undefined;
  }, [percentage]);

  // Color based on health
  const barColor = isEliminated
    ? 'bg-gray-600'
    : percentage > 60
      ? 'bg-linear-to-r from-green-500 to-emerald-400'
      : percentage > 30
        ? 'bg-linear-to-r from-yellow-500 to-amber-400'
        : 'bg-linear-to-r from-red-500 to-rose-400';

  // Low-health glow (soft pulse, not shake)
  const lowHealthGlow = !isEliminated && percentage <= 30 && percentage > 0;

  return (
    <div className={`flex items-center gap-2 ${isEliminated ? 'opacity-60' : ''}`}>
      {/* Player avatar */}
      <div className={`shrink-0 ${isEliminated ? 'grayscale' : ''}`}>
        <Avatar
          customAvatar={avatar?.customAvatar ?? undefined}
          avatarImage={avatar?.avatarImage}
          userId={player}
          size="sm"
        />
      </div>

      {/* Player name */}
      <span
        className={`text-xs font-neo-body truncate w-14 transition-colors duration-300 ${
          isEliminated ? 'text-gray-500 line-through' : 'text-neo-white'
        }`}
      >
        {player}
      </span>

      {/* Health bar */}
      <div
        className={`relative flex-1 h-2.5 rounded-full bg-neo-navy-light/80 border border-black/40 overflow-hidden transition-shadow duration-500 ${
          lowHealthGlow ? 'shadow-[0_0_6px_rgba(239,68,68,0.5)]' : ''
        }`}
      >
        {/* Fill bar */}
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-700 ease-out`}
          style={{ width: `${isEliminated ? 0 : percentage}%` }}
        />
        {/* Damage flash overlay */}
        <div
          className={`absolute inset-0 rounded-full bg-white/30 transition-opacity duration-400 ${
            flash ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Subtle shimmer on healthy bars */}
        {!isEliminated && percentage > 0 && (
          <div
            className="absolute inset-0 rounded-full bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer"
            style={{ backgroundSize: '200% 100%', animationDuration: '3s' }}
          />
        )}
      </div>

      {/* Percentage label */}
      <span
        className={`text-[10px] font-bold tabular-nums w-7 text-end transition-colors duration-300 ${
          isEliminated ? 'text-gray-500' : percentage <= 30 ? 'text-red-400' : 'text-neo-white'
        }`}
      >
        {isEliminated ? '✕' : `${Math.round(percentage)}`}
      </span>
    </div>
  );
});

export const WordHuntPlayerLives = memo<WordHuntPlayerLivesProps>(function WordHuntPlayerLives({
  playerLives,
  eliminatedPlayers,
  currentPlayer,
  playerAvatars,
}) {
  const otherPlayers = React.useMemo(
    () => Object.keys(playerLives).filter((p) => p !== currentPlayer),
    [playerLives, currentPlayer],
  );

  if (otherPlayers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5" data-testid="word-hunt-player-lives">
      {otherPlayers.map((player) => (
        <PlayerLifeRow
          key={player}
          player={player}
          life={playerLives[player] || 0}
          isEliminated={eliminatedPlayers.includes(player)}
          avatar={playerAvatars?.[player]}
        />
      ))}
    </div>
  );
});
