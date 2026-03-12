'use client';

import Link from 'next/link';
import { Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { TopPlayer } from '@/hooks/useTopPlayers';

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

interface LandingLeaderboardPreviewProps {
  players: TopPlayer[];
  loading: boolean;
  /** Show top 3 only with horizontal layout for mobile */
  compact?: boolean;
}

export function LandingLeaderboardPreview({ players, loading, compact }: LandingLeaderboardPreviewProps) {
  const { t, language, dir } = useLanguage();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  if (loading) {
    return (
      <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard-lg rounded-neo-lg p-4 animate-pulse">
        <div className="h-6 w-32 bg-neo-white/10 rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-6 h-6 bg-neo-white/10 rounded" />
            <div className="w-8 h-8 bg-neo-white/10 rounded-full" />
            <div className="h-4 flex-1 bg-neo-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (players.length === 0) return null;

  const displayPlayers = compact ? players.slice(0, 3) : players;

  // Compact: horizontal podium layout for mobile
  if (compact) {
    return (
      <div className="bg-neo-navy-light border-2 border-neo-black shadow-hard rounded-neo p-3">
        <div className="flex items-center justify-center gap-1 mb-2">
          <Trophy className="w-4 h-4 text-neo-yellow" />
          <h3 className="font-black text-neo-white uppercase text-xs">
            {t('landing.todaysTopPlayers')}
          </h3>
        </div>
        <div className="flex justify-center gap-3">
          {displayPlayers.map((player, i) => (
            <div key={player.username} className="flex flex-col items-center gap-1 min-w-0">
              <span className={cn('font-black text-sm', RANK_COLORS[i])}>
                {i + 1}
              </span>
              <Avatar
                avatarImage={player.avatarImage ?? undefined}
                profilePictureUrl={player.profilePictureUrl}
                customAvatar={player.avatarConfig as any}
                size="sm"
              />
              <span className="font-bold text-neo-white text-xs truncate max-w-[72px]">
                {player.displayName || player.username}
              </span>
              <span className="font-black text-neo-lime text-xs">
                {player.totalScore.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <Link
          href={`/${language}/leaderboard`}
          className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-neo-white/10 text-neo-white/60 hover:text-neo-white text-xs font-bold transition-colors"
        >
          {t('landing.viewFullLeaderboard')}
          <ArrowIcon className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard-lg rounded-neo-lg p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-neo-yellow" />
        <h3 className="font-black text-neo-white uppercase text-sm sm:text-base">
          {t('landing.todaysTopPlayers')}
        </h3>
      </div>

      <div className="space-y-1">
        {displayPlayers.map((player, i) => (
          <div
            key={player.username}
            className={cn(
              'flex items-center gap-3 py-1.5 px-2 rounded-neo',
              i < 3 && 'bg-neo-white/5'
            )}
          >
            <span className={cn(
              'font-black text-lg w-6 text-center',
              i < 3 ? RANK_COLORS[i] : 'text-neo-white/50'
            )}>
              {i + 1}
            </span>
            <Avatar
              avatarImage={player.avatarImage ?? undefined}
              profilePictureUrl={player.profilePictureUrl}
              customAvatar={player.avatarConfig as any}
              size="sm"
            />
            <span className="flex-1 font-bold text-neo-white text-sm truncate">
              {player.displayName || player.username}
            </span>
            <span className="font-black text-neo-lime text-sm">
              {player.totalScore.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <Link
        href={`/${language}/leaderboard`}
        className={cn(
          'flex items-center justify-center gap-1.5 mt-3 pt-3',
          'border-t border-neo-white/10',
          'text-neo-white/60 hover:text-neo-white text-sm font-bold',
          'transition-colors'
        )}
      >
        {t('landing.viewFullLeaderboard')}
        <ArrowIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
