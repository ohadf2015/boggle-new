'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Flame } from 'lucide-react';
import Avatar from '../Avatar';
import { CoinBalance } from '../CoinBalance';
import { RankTierChip } from '../seasons/RankTierChip';
import { tierVisual, type TierId } from '@/lib/seasons/scoreTier';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';

interface DrawerProfileHeroProps {
  /** Localized link to the profile page. */
  href: string;
  onNavigate: () => void;
  displayName: string;
  avatarConfig: React.ComponentProps<typeof Avatar>['customAvatar'];
  userId?: string;
  /** XP/game level — shown ONCE, on the avatar badge. */
  currentLevel: number | null;
  tier: TierId;
  coins: number;
  streak: number;
  totalGames: number | null;
  /** Player-chosen accent hex (PlayerStyle). When set it wins over the tier ring color. */
  accentHex: string | null;
  isRtl: boolean;
}

/**
 * Authenticated profile hero for the side drawer.
 *
 * Presentational (plain props) so it can be rendered + screenshotted in
 * isolation — the authed branch isn't reachable in local guest-only dev.
 * The rank is shown as its badge IMAGE + localized name; the avatar ring takes
 * the tier's brand color unless the player set a custom accent.
 */
export function DrawerProfileHero({
  href,
  onNavigate,
  displayName,
  avatarConfig,
  userId,
  currentLevel,
  tier,
  coins,
  streak,
  totalGames,
  accentHex,
  isRtl,
}: DrawerProfileHeroProps) {
  const { t } = useLanguage();
  const visual = tierVisual(tier);
  // Player accent wins; otherwise the avatar ring carries the tier's brand color.
  const ringColor = accentHex || visual.color;

  const hasStreak = streak > 0;
  const hasGames = totalGames != null && totalGames > 0;

  return (
    <Link href={href} onClick={onNavigate} className="block group">
      <div className="flex items-center gap-3.5">
        {/* Avatar — tier/accent ring + single level badge */}
        <div className="relative shrink-0">
          <div
            className="rounded-full border-3 shadow-hard-sm p-0.5 bg-neo-navy transition-colors"
            style={{ borderColor: ringColor }}
          >
            <Avatar customAvatar={avatarConfig} userId={userId} size="lg" />
          </div>
          {currentLevel != null && (
            <div className="absolute -bottom-1 -right-1 bg-neo-lime text-neo-black text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-neo-black shadow-hard-sm">
              {currentLevel}
            </div>
          )}
        </div>

        {/* Name → rank badge → coins → stats */}
        <div className="flex flex-col min-w-0 gap-1.5">
          <span className="text-base font-black text-neo-white truncate leading-tight">
            {displayName}
          </span>

          <RankTierChip tier={tier} size="sm" showImage className="self-start" />

          <CoinBalance coins={coins} size="md" showSparkle />

          {(hasStreak || hasGames) && (
            <div className="flex items-center gap-2 text-[11px] font-bold mt-0.5">
              {hasStreak && (
                <span className="inline-flex items-center gap-1 text-neo-orange">
                  <Flame className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  {streak}
                </span>
              )}
              {hasStreak && hasGames && (
                <span className="text-neo-white/30" aria-hidden="true">·</span>
              )}
              {hasGames && (
                <span className="text-neo-white/70">
                  {totalGames} {t('profile.gamesPlayed')}
                </span>
              )}
            </div>
          )}
        </div>

        <ChevronRight
          className={cn(
            'ms-auto w-4 h-4 text-neo-white/50 group-hover:text-neo-white transition-colors shrink-0',
            isRtl && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export default DrawerProfileHero;
