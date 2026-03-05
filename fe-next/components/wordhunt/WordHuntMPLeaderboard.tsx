'use client';

import React, { memo } from 'react';
import { Skull } from 'lucide-react';

export interface LeaderboardPlayer {
  username: string;
  score: number;
  wordCount?: number;
}

export interface WordHuntMPLeaderboardProps {
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  leaderboard: LeaderboardPlayer[];
  currentUsername: string;
  t: (key: string) => string;
}

export const WordHuntMPLeaderboard = memo<WordHuntMPLeaderboardProps>(({
  playerLives,
  eliminatedPlayers,
  leaderboard,
  currentUsername,
  t,
}) => {
  const eliminatedSet = new Set(eliminatedPlayers);

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-bold text-neo-white/60 uppercase mb-1">
        {t('wordHunt.mp.players')}
      </div>
      <div className="flex flex-col gap-1">
        {leaderboard.map((player) => {
          const isEliminated = eliminatedSet.has(player.username);
          const isCurrent = player.username === currentUsername;
          const life = playerLives[player.username] ?? 0;

          return (
            <div
              key={player.username}
              data-player={player.username}
              data-eliminated={isEliminated ? 'true' : undefined}
              data-current={isCurrent ? 'true' : undefined}
              className={`flex items-center gap-2 px-2 py-1 rounded-neo border-2 transition-colors ${
                isCurrent
                  ? 'border-neo-yellow bg-neo-yellow/10'
                  : isEliminated
                    ? 'border-neo-red/30 bg-neo-red/5 opacity-50'
                    : 'border-neo-white/10 bg-neo-white/5'
              }`}
            >
              {/* Player name */}
              <span className={`text-sm font-bold truncate flex-shrink min-w-0 ${
                isCurrent ? 'text-neo-yellow' : 'text-neo-white'
              }`}>
                {player.username}
              </span>

              {/* Life bar */}
              <div className="flex-1 min-w-[40px]">
                <div
                  role="progressbar"
                  aria-valuenow={life}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="h-2 rounded-full bg-neo-white/10 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      life > 66 ? 'bg-green-400' :
                      life > 33 ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${Math.max(life, 0)}%` }}
                  />
                </div>
              </div>

              {/* Score */}
              <span className="text-sm font-mono font-bold text-neo-white tabular-nums min-w-[32px] text-right">
                {player.score}
              </span>

              {/* Eliminated icon */}
              {isEliminated && (
                <Skull size={14} className="text-neo-red flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

WordHuntMPLeaderboard.displayName = 'WordHuntMPLeaderboard';
