'use client';

import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import { Trophy, Target, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import Avatar from '@/components/Avatar';
import { MobileTooltip } from './MobileTooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface PlayerTooltipData {
  /** Player UUID — preferred for profile links */
  id?: string;
  username: string;
  displayName?: string;
  avatarImage?: string;
  customAvatar?: CustomAvatarConfig | null;
  countryCode?: string | null;
  level?: number;
  winRate?: number;
  totalGames?: number;
  score?: number;
}

interface PlayerProfileTooltipProps {
  player: PlayerTooltipData;
  /** Skip tooltip for current user */
  isCurrentUser?: boolean;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Mini profile card shown on hover/tap for player names in leaderboards.
 * Shows avatar, name, level, country, win stats.
 * Links to full /player/[username] profile page.
 */
const PlayerProfileTooltipContent = memo<{
  player: PlayerTooltipData;
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
}>(({ player, t, language }) => {
  const countryFlag = player.countryCode ? getCountryFlag(player.countryCode) : null;
  const name = player.displayName || player.username;

  return (
    <div className="flex flex-col gap-2 min-w-[180px] max-w-[220px]">
      {/* Header: Avatar + Name */}
      <div className="flex items-center gap-2">
        <Avatar
          avatarImage={player.avatarImage}
          customAvatar={player.customAvatar}
          userId={player.id}
          size="lg"
          className="border-2 border-neo-black"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-black text-sm text-neo-black truncate">
              {name}
            </span>
            {countryFlag && <span className="text-sm">{countryFlag}</span>}
          </div>
          {player.level !== undefined && (
            <span className="text-[10px] font-bold text-neo-black/60">
              {t('profile.level')} {player.level}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-2">
        {player.winRate !== undefined && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-neo-black/70">
            <Trophy className="w-3 h-3 text-neo-orange" />
            {player.winRate}%
          </div>
        )}
        {player.totalGames !== undefined && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-neo-black/70">
            <Target className="w-3 h-3 text-neo-cyan" />
            {player.totalGames} {t('profile.gamesPlayed').toLowerCase()}
          </div>
        )}
      </div>

      {/* View Profile Link */}
      <Link
        href={`/${language}/player/${encodeURIComponent(player.id || player.username)}`}
        className={cn(
          'flex items-center justify-center gap-1',
          'text-[11px] font-black uppercase',
          'bg-neo-navy text-neo-white',
          'px-2 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
          'hover:bg-neo-cyan hover:text-neo-black',
          'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
          'transition-all'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="w-3 h-3" />
        {t('profile.viewProfile')}
      </Link>
    </div>
  );
});

PlayerProfileTooltipContent.displayName = 'PlayerProfileTooltipContent';

/**
 * Wraps any leaderboard player element with a hover/tap tooltip
 * showing a mini profile card + link to full profile page.
 *
 * Skips rendering tooltip for the current user.
 */
const PlayerProfileTooltip = memo<PlayerProfileTooltipProps>(({
  player,
  isCurrentUser = false,
  children,
  side = 'top',
}) => {
  const { t, language } = useLanguage();

  if (isCurrentUser) {
    return <>{children}</>;
  }

  return (
    <MobileTooltip
      content={<PlayerProfileTooltipContent player={player} t={t} language={language} />}
      side={side}
      contentClassName="p-3"
      delayDuration={300}
    >
      {children}
    </MobileTooltip>
  );
});

PlayerProfileTooltip.displayName = 'PlayerProfileTooltip';

export default PlayerProfileTooltip;
