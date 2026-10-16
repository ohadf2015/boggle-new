'use client';

import type { ReactNode } from 'react';
import { ArrowUp, Crown, Play } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { TierBadge, TierProgressBar } from '@/components/ui/TierBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import {
  getGlobalLeaderboardTier,
  getLeaderboardTierProgress,
  getNextTierThreshold,
  GLOBAL_LEADERBOARD_TIERS,
} from '@/lib/ranked/leaderboardTiers';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface YouCardEntry {
  player_id: string;
  display_name?: string;
  username?: string;
  avatar_config?: CustomAvatarConfig | null;
  total_score?: number;
}

interface YouCardProps {
  userId?: string;
  avatarConfig?: CustomAvatarConfig | null;
  rank?: number;
  score?: number;
  leaderboard: YouCardEntry[];
  onPlay: () => void;
  /** Auth or rank still resolving — never show the play prompt to a player who may be ranked. */
  pending?: boolean;
  children?: ReactNode;
}

const CARD = 'mb-6 rounded-neo-lg border-neo-thick border-neo-black bg-neo-navy-light p-4 shadow-hard-cyan';

export function YouCard({ userId, avatarConfig, rank, score, leaderboard, onPlay, pending, children }: YouCardProps) {
  const { t, language } = useLanguage();

  if (pending) {
    return <div data-testid="leaderboard-you-pending" aria-hidden="true" className={`${CARD} h-[108px] animate-pulse motion-reduce:animate-none`} />;
  }

  if (!rank || score == null) {
    return (
      <div data-testid="leaderboard-you" className={`${CARD} flex items-center gap-3`}>
        {userId && <Avatar customAvatar={avatarConfig} userId={userId} size="md" />}
        <p className="flex-1 font-neo-display text-base font-bold text-neo-white">
          {t('leaderboard.noRankYet')}
        </p>
        <button
          type="button"
          onClick={onPlay}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-neo border-neo border-neo-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm transition-transform active:translate-y-px"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {t('common.playNow')}
        </button>
      </div>
    );
  }

  const tier = getGlobalLeaderboardTier(score);
  const candidate = rank > 1 ? leaderboard[rank - 2] : undefined;
  const above = candidate?.player_id !== userId ? candidate : undefined;
  const gap = above?.total_score != null ? above.total_score - score + 1 : null;

  let nextStep: ReactNode;
  if (rank === 1) {
    nextStep = (
      <p className="flex items-center gap-2 font-neo-display text-sm font-bold text-neo-yellow">
        <Crown className="h-4 w-4" aria-hidden="true" />
        {t('leaderboard.youAreFirst')}
      </p>
    );
  } else if (above && gap != null && gap > 0) {
    nextStep = (
      <p className="flex min-w-0 items-center gap-2 text-sm text-neo-cream/80">
        <ArrowUp className="h-4 w-4 shrink-0 text-neo-lime" aria-hidden="true" />
        <span className="font-neo-display font-black tabular-nums text-neo-lime">
          {safeToLocaleString(gap, language)}
        </span>
        <span className="shrink-0">{t('leaderboard.toCatch')}</span>
        <span className="truncate font-bold text-neo-white">{above.display_name || above.username}</span>
      </p>
    );
  } else {
    nextStep = (
      <TierProgressBar
        tier={tier}
        progress={getLeaderboardTierProgress(score, GLOBAL_LEADERBOARD_TIERS)}
        nextThreshold={getNextTierThreshold(score, GLOBAL_LEADERBOARD_TIERS)}
      />
    );
  }

  return (
    <div data-testid="leaderboard-you" className={CARD}>
      <div className="flex items-center gap-3">
        <Avatar customAvatar={avatarConfig} userId={userId} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-neo-cream/60">{t('leaderboard.you')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TierBadge tier={tier} size="sm" showLabel />
            <span className="text-sm tabular-nums text-neo-cream/80">
              {safeToLocaleString(score, language)} {t('leaderboard.points')}
            </span>
          </div>
        </div>
        <p className="font-neo-display text-4xl font-black leading-none tabular-nums text-neo-cyan">#{rank}</p>
      </div>
      <div className="mt-3 border-t-2 border-neo-black/40 pt-3">{nextStep}</div>
      {children}
    </div>
  );
}
