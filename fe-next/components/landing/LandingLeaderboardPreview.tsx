'use client';

import Link from 'next/link';
import { m } from 'framer-motion';
import { Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import PlayerProfileTooltip from '@/components/ui/PlayerProfileTooltip';
import PrestigeBadge from '@/components/ui/PrestigeBadge';
import type { TopPlayer } from '@/hooks/useTopPlayers';

const RANK_BG = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600'];
const RANK_TEXT = ['text-neo-black', 'text-neo-black', 'text-neo-black'];

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
    return compact ? (
      <div className="bg-neo-navy-light border-2 border-neo-black shadow-hard rounded-neo p-3">
        <div className="flex items-center justify-center gap-1 mb-2">
          <div className="w-4 h-4 rounded bg-neo-yellow/30 animate-pulse" />
          <div className="h-3.5 w-24 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <div className="flex justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <div key={`podium-${i}`} className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-6 h-6 rounded-full border-2 border-neo-black/20 animate-pulse',
                i === 0 ? 'bg-yellow-400/30' : i === 1 ? 'bg-gray-300/30' : 'bg-amber-600/30'
              )} />
              <div className="w-10 h-10 rounded-full bg-neo-white/10 animate-pulse" />
              <div className="h-3 w-12 bg-neo-white/8 rounded animate-pulse" />
              <div className="h-3 w-8 bg-neo-lime/15 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="bg-neo-navy-light border-3 border-neo-black shadow-hard-lg rounded-neo-lg p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-neo-yellow/30 animate-pulse" />
          <div className="h-5 w-28 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`row-${i}`} className={cn(
              'flex items-center gap-3 py-1.5 px-2 rounded-neo',
              i < 3 && 'bg-neo-white/5'
            )}>
              <div className={cn(
                'w-7 h-7 rounded-full border-2 border-neo-black/20 shrink-0 animate-pulse',
                i === 0 ? 'bg-yellow-400/30' : i === 1 ? 'bg-gray-300/30' : i === 2 ? 'bg-amber-600/30' : 'bg-neo-white/10'
              )} />
              <div className="w-8 h-8 rounded-full bg-neo-white/10 shrink-0 animate-pulse" />
              <div className="flex-1 h-4 bg-neo-white/8 rounded animate-pulse" style={{ maxWidth: `${70 - i * 8}%` }} />
              <div className="h-4 w-12 bg-neo-lime/15 rounded shrink-0 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-neo-white/10">
          <div className="h-3.5 w-28 bg-neo-white/8 rounded animate-pulse" />
        </div>
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
          <h2 className="font-black text-neo-white uppercase text-xs">
            {t('landing.todaysTopPlayers')}
          </h2>
        </div>
        <div className="flex justify-center gap-3">
          {displayPlayers.map((player, i) => (
            <m.div
              key={player.username}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, type: 'spring', stiffness: 350, damping: 22 }}
              className="flex flex-col items-center gap-1 min-w-0"
            >
              <span className={cn(
                'font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-neo-black',
                RANK_BG[i], RANK_TEXT[i]
              )}>
                {i + 1}
              </span>
              <Avatar
                avatarImage={player.avatarImage ?? undefined}
                userId={player.id}
                customAvatar={player.avatarConfig}
                size="sm"
              />
              <PlayerProfileTooltip
                player={{
                  id: player.id,
                  username: player.username,
                  displayName: player.displayName ?? undefined,

                  avatarImage: player.avatarImage ?? undefined,
                  customAvatar: player.avatarConfig,
                }}
                side="bottom"
              >
                <Link
                  href={`/${language}/player/${encodeURIComponent(player.id)}`}
                  prefetch={false}
                  className="inline-flex items-center gap-1 font-bold text-neo-white text-xs truncate max-w-[80px] sm:max-w-[100px] cursor-pointer hover:text-neo-cyan transition-colors"
                >
                  <PrestigeBadge level={player.prestigeLevel ?? 0} size="xs" hideLabel />
                  <span className="truncate">{player.displayName || player.username}</span>
                </Link>
              </PlayerProfileTooltip>
              <span className="font-black text-neo-lime text-xs">
                {player.totalScore.toLocaleString()}
              </span>
            </m.div>
          ))}
        </div>
        <Link
          href={`/${language}/leaderboard`}
          prefetch={false}
          className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-neo-white/10 text-neo-white hover:text-neo-white text-xs font-bold transition-colors"
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
        <h2 className="font-black text-neo-white uppercase text-sm sm:text-base neo-title-sm">
          {t('landing.todaysTopPlayers')}
        </h2>
      </div>

      <div className="space-y-1">
        {displayPlayers.map((player, i) => (
          <m.div
            key={player.username}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 * i, type: 'spring', stiffness: 350, damping: 24 }}
            className={cn(
              'flex items-center gap-3 py-1.5 px-2 rounded-neo',
              i < 3 && 'bg-neo-white/5'
            )}
          >
            <span className={cn(
              'font-black text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 border-neo-black',
              i < 3 ? `${RANK_BG[i]} ${RANK_TEXT[i]}` : 'bg-neo-white/10 text-neo-white'
            )}>
              {i + 1}
            </span>
            <Avatar
              avatarImage={player.avatarImage ?? undefined}

              customAvatar={player.avatarConfig}
              size="sm"
            />
            <PlayerProfileTooltip
              player={{
                id: player.id,
                username: player.username,
                displayName: player.displayName ?? undefined,

                avatarImage: player.avatarImage ?? undefined,
                customAvatar: player.avatarConfig,
              }}
              side="right"
            >
              <Link
                href={`/${language}/player/${encodeURIComponent(player.id)}`}
                prefetch={false}
                className="flex-1 inline-flex items-center gap-1.5 font-bold text-neo-white text-sm truncate cursor-pointer hover:text-neo-cyan transition-colors"
              >
                <PrestigeBadge level={player.prestigeLevel ?? 0} size="sm" />
                <span className="truncate">{player.displayName || player.username}</span>
              </Link>
            </PlayerProfileTooltip>
            <span className="font-black text-neo-lime text-sm">
              {player.totalScore.toLocaleString()}
            </span>
          </m.div>
        ))}
      </div>

      <Link
        href={`/${language}/leaderboard`}
        prefetch={false}
        className={cn(
          'flex items-center justify-center gap-1.5 mt-3 pt-3',
          'border-t border-neo-white/10',
          'text-neo-white hover:text-neo-white text-sm font-bold',
          'transition-colors'
        )}
      >
        {t('landing.viewFullLeaderboard')}
        <ArrowIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}
