'use client';

import React, { memo } from 'react';
import { m } from 'framer-motion';
import { Trophy, Swords, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import type { PublicProfile } from '@/shared/types/publicProfile';

interface PlayerProfileCardProps {
  profile: PublicProfile;
  compact?: boolean;
  onChallenge?: (username: string) => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Percentile tier colors for the badge
 */
function getPercentileTier(percentile: number) {
  if (percentile <= 1) return { bg: 'bg-amber-400', text: 'text-neo-black', border: 'border-amber-500' };
  if (percentile <= 5) return { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' };
  if (percentile <= 10) return { bg: 'bg-neo-cyan', text: 'text-neo-black', border: 'border-cyan-500' };
  if (percentile <= 25) return { bg: 'bg-neo-lime', text: 'text-neo-black', border: 'border-lime-500' };
  return { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-500' };
}

/**
 * Compact player profile card
 * Used in leaderboards, search results, friend suggestions, lobby
 */
const PlayerProfileCard = memo<PlayerProfileCardProps>(({
  profile,
  compact = false,
  onChallenge,
  onClick,
  className,
}) => {
  const { t } = useLanguage();
  const tier = getPercentileTier(profile.percentile);

  return (
    <m.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'relative overflow-hidden rounded-neo border-3 border-neo-black shadow-hard',
        'bg-neo-navy',
        compact ? 'p-2' : 'p-3 sm:p-4',
        className
      )}
    >
      {/* Clickable card area */}
      <button
        onClick={onClick}
        className="w-full text-start"
        aria-label={t('profile.viewProfile')}
      >
        <div className={cn(
          'flex items-center',
          compact ? 'gap-2' : 'gap-3'
        )}>
          {/* Avatar */}
          <Avatar
            customAvatar={profile.customAvatar ?? undefined}

            size={compact ? 'md' : 'lg'}
            className="shrink-0 border-2 border-neo-black"
          />

          {/* Info column */}
          <div className="flex-1 min-w-0">
            {/* Name + country */}
            <div className="flex items-center gap-1.5">
              <span className={cn(
                'font-black text-white truncate',
                compact ? 'text-sm' : 'text-base'
              )}>
                {profile.displayName}
              </span>
              {profile.countryCode && (
                <span className="text-sm shrink-0">{getCountryFlag(profile.countryCode)}</span>
              )}
            </div>

            {/* Level + percentile */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                {t('profile.level')} {profile.currentLevel}
              </span>
              {profile.percentile <= 50 && (
                <span className={cn(
                  'text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded border',
                  tier.bg, tier.text, tier.border
                )}>
                  {t('profile.topPercent', { percent: profile.percentile })}
                </span>
              )}
            </div>
          </div>

          {/* Stats column */}
          {!compact && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Win rate */}
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-neo-yellow" />
                  <span className="text-sm font-black text-white">{profile.winRate}%</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {t('profile.winRate')}
                </span>
              </div>

              {/* Games played */}
              <div className="text-center hidden sm:block">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-neo-cyan" />
                  <span className="text-sm font-black text-white">{profile.totalGames}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {t('profile.games')}
                </span>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Challenge button */}
      {onChallenge && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChallenge(profile.username);
          }}
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-1.5',
            'px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
            'bg-neo-orange text-neo-black font-black text-xs uppercase',
            'hover:brightness-110 active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]',
            'transition-all'
          )}
          aria-label={t('profile.challenge')}
        >
          <Swords className="w-3.5 h-3.5" />
          {t('profile.challenge')}
        </button>
      )}
    </m.div>
  );
});

PlayerProfileCard.displayName = 'PlayerProfileCard';

export default PlayerProfileCard;
