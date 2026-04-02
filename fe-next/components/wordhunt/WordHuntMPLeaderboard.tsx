'use client';

import { memo, useRef, useState, useEffect } from 'react';
import { Skull, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';

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
  wrongGuessPlayers?: string[];
  t: (key: string) => string;
}

/** Color tier for mini life bars */
function getLifeColor(life: number) {
  if (life > 66) return { bar: 'bg-emerald-400', bg: 'bg-emerald-900/40' };
  if (life > 33) return { bar: 'bg-amber-400', bg: 'bg-amber-900/40' };
  return { bar: 'bg-red-400', bg: 'bg-red-900/40' };
}

export const WordHuntMPLeaderboard = memo<WordHuntMPLeaderboardProps>(({
  playerLives,
  eliminatedPlayers,
  leaderboard,
  currentUsername,
  wrongGuessPlayers = [],
  t,
}) => {
  const eliminatedSet = new Set(eliminatedPlayers);

  // Detect life drops for damage flash
  const prevLivesRef = useRef<Record<string, number>>({});
  const [lifeDropPlayers, setLifeDropPlayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevLivesRef.current;
    const newDrops: string[] = [];

    for (const [name, life] of Object.entries(playerLives)) {
      if (prev[name] !== undefined && life < prev[name]) {
        newDrops.push(name);
      }
    }

    prevLivesRef.current = { ...playerLives };

    if (newDrops.length > 0) {
      setLifeDropPlayers(new Set(newDrops));
      const timer = setTimeout(() => setLifeDropPlayers(new Set()), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [playerLives]);

  const wrongGuessSet = new Set([...wrongGuessPlayers, ...lifeDropPlayers]);

  return (
    <div className="px-2 py-1.5">
      {/* Mobile: horizontal compact strip */}
      <div className="flex gap-1.5 lg:hidden overflow-x-auto scrollbar-hide">
        {leaderboard.map((player) => {
          const isEliminated = eliminatedSet.has(player.username);
          const isCurrent = player.username === currentUsername;
          const life = playerLives[player.username] ?? 0;
          const colors = getLifeColor(life);
          const isDamaged = wrongGuessSet.has(player.username);

          return (
            <div
              key={player.username}
              data-player={player.username}
              data-eliminated={isEliminated ? 'true' : undefined}
              data-current={isCurrent ? 'true' : undefined}
              className={cn(
                "flex-1 min-w-0 flex flex-col gap-0.5 px-2 py-1 rounded-neo border-2 transition-all",
                isCurrent
                  ? 'border-neo-yellow bg-neo-yellow/10'
                  : isEliminated
                    ? 'border-neo-red/30 bg-neo-red/5 opacity-40'
                    : 'border-neo-white/15 bg-neo-white/5',
                isDamaged && !isEliminated && 'animate-neo-damage-drip'
              )}
            >
              {/* Name + Score row */}
              <div className="flex items-center justify-between gap-1 min-w-0">
                <PlayerProfileTooltip
                  player={{ username: player.username, score: player.score }}
                  isCurrentUser={isCurrent}
                  side="top"
                >
                  <span className={cn(
                    "text-[11px] font-bold truncate",
                    isCurrent ? 'text-neo-yellow' : 'text-neo-white'
                  )}>
                    {player.username}
                  </span>
                </PlayerProfileTooltip>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="text-[11px] font-mono font-bold text-neo-white/80 tabular-nums">
                    {player.score}
                  </span>
                  {isDamaged && !isEliminated && (
                    <X size={10} className="text-neo-red" data-wrong-guess />
                  )}
                  {isEliminated && (
                    <Skull size={10} className="text-neo-red" />
                  )}
                </div>
              </div>

              {/* Chunky mini life bar */}
              <div
                role="progressbar"
                aria-valuenow={life}
                aria-valuemin={0}
                aria-valuemax={100}
                className={cn(
                  "h-2.5 rounded-sm overflow-hidden border border-neo-black/40",
                  colors.bg
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-sm transition-all duration-500 relative overflow-hidden",
                    colors.bar,
                    isEliminated && 'opacity-30'
                  )}
                  style={{ width: `${Math.max(life, 0)}%` }}
                >
                  {/* Mini shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop sidebar: vertical detailed list */}
      <div className="hidden lg:block">
        <div className="text-xs font-bold text-neo-white/60 uppercase mb-1.5 tracking-wider">
          {t('wordHunt.mp.players')}
        </div>
        <div className="flex flex-col gap-1.5">
          {leaderboard.map((player) => {
            const isEliminated = eliminatedSet.has(player.username);
            const isCurrent = player.username === currentUsername;
            const life = playerLives[player.username] ?? 0;
            const colors = getLifeColor(life);
            const isDamaged = wrongGuessSet.has(player.username);

            return (
              <div
                key={player.username}
                data-player={player.username}
                data-eliminated={isEliminated ? 'true' : undefined}
                data-current={isCurrent ? 'true' : undefined}
                className={cn(
                  "flex flex-col gap-1 px-2.5 py-1.5 rounded-neo border-2 transition-all",
                  isCurrent
                    ? 'border-neo-yellow bg-neo-yellow/10'
                    : isEliminated
                      ? 'border-neo-red/30 bg-neo-red/5 opacity-50'
                      : 'border-neo-white/10 bg-neo-white/5',
                  isDamaged && !isEliminated && 'animate-neo-damage-drip'
                )}
              >
                {/* Name + Score */}
                <div className="flex items-center justify-between gap-2">
                  <PlayerProfileTooltip
                    player={{ username: player.username, score: player.score }}
                    isCurrentUser={isCurrent}
                    side="right"
                  >
                    <span className={cn(
                      "text-sm font-bold truncate flex-shrink min-w-0",
                      isCurrent ? 'text-neo-yellow' : 'text-neo-white cursor-pointer hover:underline'
                    )}>
                      {player.username}
                    </span>
                  </PlayerProfileTooltip>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm font-mono font-bold text-neo-white tabular-nums">
                      {player.score}
                    </span>
                    {isDamaged && !isEliminated && (
                      <X size={14} className="text-neo-red" data-wrong-guess />
                    )}
                    {isEliminated && (
                      <Skull size={14} className="text-neo-red" />
                    )}
                  </div>
                </div>

                {/* Life bar — chunkier with segments */}
                <div
                  role="progressbar"
                  aria-valuenow={life}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className={cn(
                    "h-3.5 rounded-sm overflow-hidden border-2 border-neo-black/30 relative",
                    colors.bg
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-sm transition-all duration-500 relative overflow-hidden",
                      colors.bar,
                      isEliminated && 'opacity-30'
                    )}
                    style={{ width: `${Math.max(life, 0)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" />
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-white/30 pointer-events-none" />
                  </div>
                  {/* Segment markers */}
                  {[25, 50, 75].map((seg) => (
                    <div
                      key={seg}
                      className="absolute top-0 bottom-0 w-px bg-neo-black/20 pointer-events-none"
                      style={{ left: `${seg}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

WordHuntMPLeaderboard.displayName = 'WordHuntMPLeaderboard';
