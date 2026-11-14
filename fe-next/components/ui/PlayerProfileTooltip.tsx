'use client';

import { isValidElement, memo, type ReactNode } from 'react';
import { Trophy, Target } from 'lucide-react';
import LevelBadge from '@/components/LevelBadge';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import Avatar from '@/components/Avatar';
import { MobileTooltip } from './MobileTooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PlayerSummaryTrigger } from '@/components/players/PlayerSummaryTrigger';

export interface PlayerTooltipData {
  /** Player UUID — when set, a tap opens the summary card with a profile link */
  id?: string;
  /** Opaque row key on an id-free daily board (resolved on tap for signed-in viewers) */
  boardKey?: string;
  /** Equipped progression title */
  title?: string | null;
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
  /** Analytics surface for the summary card */
  surface?: string;
}

/**
 * Hover/tap mini card for a player with no account behind the row (room
 * nickname, guest, bot): avatar, name, level, country, win stats. There is no
 * profile to link to — rows with an account open PlayerSummaryTrigger instead.
 */
const PlayerProfileTooltipContent = memo<{
  player: PlayerTooltipData;
  t: (key: string, params?: Record<string, string | number>) => string;
}>(({ player, t }) => {
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
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neo-black/60">
              <LevelBadge level={player.level} size="sm" animate={false} />
              {t('profile.level')}
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

    </div>
  );
});

PlayerProfileTooltipContent.displayName = 'PlayerProfileTooltipContent';

/**
 * Wraps a player's name on a board. With an account behind the row (id, or a
 * daily board key) a tap opens the summary card with a link to the full
 * profile; otherwise a hover/tap tooltip with what the row knows.
 *
 * Skips both for the current user.
 */
const PlayerProfileTooltip = memo<PlayerProfileTooltipProps>(({
  player,
  isCurrentUser = false,
  children,
  side = 'top',
  surface = 'leaderboard',
}) => {
  const { t } = useLanguage();

  if (isCurrentUser) {
    return <>{children}</>;
  }

  if ((player.id || player.boardKey) && isValidElement(children)) {
    return (
      <PlayerSummaryTrigger
        player={{
          id: player.id,
          boardKey: player.boardKey,
          name: player.displayName || player.username,
          avatarImage: player.avatarImage,
          customAvatar: player.customAvatar,
          countryCode: player.countryCode,
          title: player.title,
        }}
        surface={surface}
      >
        {children}
      </PlayerSummaryTrigger>
    );
  }

  return (
    <MobileTooltip
      content={<PlayerProfileTooltipContent player={player} t={t} />}
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
