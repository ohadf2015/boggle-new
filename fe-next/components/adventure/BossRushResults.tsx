/**
 * BossRushResults — Results screen for Boss Rush mode.
 *
 * Shows after rush completes or fails:
 * - Title (complete/failed)
 * - Bosses defeated X/Y with boss icons
 * - Total score
 * - Time taken
 * - Retry / Exit buttons
 */

'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Swords, Trophy, Clock, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { trackRewardedAdOffered } from '@/utils/growthTracking';
import type { BossRushState } from './hooks/useBossRush';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });

// ==============================================
// TYPES
// ==============================================

interface BossRushResultsProps {
  state: BossRushState;
  onRetry: () => void;
  onExit: () => void;
}

// ==============================================
// HELPERS
// ==============================================

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ==============================================
// COMPONENT
// ==============================================

const BossRushResults = memo<BossRushResultsProps>(({ state, onRetry, onExit }) => {
  const { t } = useLanguageSafe();
  const isVictory = state.isComplete;
  // Capture end time once on mount to avoid impure Date.now() in render
  const [endTime] = useState(() => Date.now());
  const elapsed = endTime - state.startTime;

  const { showInterstitial } = useInterstitialAd();
  const { submitLeaderboardScore } = useCrazyGames();
  // R5 — rewarded continue on failure (feature reward, no coin payout)
  const rewarded = useRewardedAd({
    rewardKind: 'feature',
    surface: 'retry',
    warm: true,
    onRewardEarned: () => onRetry(),
  });

  // Ads + leaderboard on mount
  useEffect(() => {
    showInterstitial('boss-rush-complete');
    if (state.totalScore > 0) {
      submitLeaderboardScore(state.totalScore);
    }
    if (!isVictory && rewarded.canShowAd && !rewarded.isDailyLimitReached) {
      trackRewardedAdOffered('boss_rush_results');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bossIcons = useMemo(() => {
    return state.defeatedBosses.map((worldId, i) => {
      const config = getBossConfig(worldId);
      const defeated = i < state.bossesDefeated;
      return { worldId, imagePath: config?.imagePath, defeated };
    });
  }, [state.defeatedBosses, state.bossesDefeated]);

  return (
    <div className="min-h-screen bg-neo-navy flex items-center justify-center px-4">
      <AdaptiveMotion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className={cn(
          'w-full max-w-md p-6 rounded-neo animate-in fade-in-0 duration-300',
          'border-neo border-neo-black shadow-hard-lg',
          isVictory ? 'bg-neo-orange/20' : 'bg-neo-red/20'
        )}
      >
        {/* Title */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {isVictory ? (
            <Trophy className="w-8 h-8 text-neo-orange" />
          ) : (
            <X className="w-8 h-8 text-neo-red" />
          )}
          <h1 className={cn(
            'text-2xl font-black uppercase tracking-tight',
            isVictory ? 'text-neo-orange' : 'text-neo-red'
          )}>
            {isVictory
              ? t('adventure.bossRush.fullClear')
              : t('adventure.bossRush.runOver')}
          </h1>
        </div>

        {/* Boss icons row */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {bossIcons.map(({ worldId, imagePath, defeated }) => (
            <div
              key={worldId}
              className={cn(
                'w-12 h-12 rounded-neo border-2 border-neo-black overflow-hidden',
                defeated ? 'opacity-100' : 'opacity-30 grayscale'
              )}
            >
              {imagePath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePath} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="space-y-3 mb-6">
          {/* Bosses defeated */}
          <div className="flex items-center justify-between px-3 py-2 bg-neo-white/5 rounded-neo border border-neo-white/10">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-neo-orange" />
              <span className="text-sm font-bold text-neo-white">
                {t('adventure.bossRush.bossesDefeated')}
              </span>
            </div>
            <span className="text-lg font-black text-neo-orange tabular-nums">
              {state.bossesDefeated}/{state.totalBosses}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center justify-between px-3 py-2 bg-neo-white/5 rounded-neo border border-neo-white/10">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-neo-yellow" />
              <span className="text-sm font-bold text-neo-white">
                {t('adventure.bossRush.totalScore')}
              </span>
            </div>
            <span className="text-lg font-black text-neo-yellow tabular-nums">
              {state.totalScore.toLocaleString()}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between px-3 py-2 bg-neo-white/5 rounded-neo border border-neo-white/10">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-neo-cyan" />
              <span className="text-sm font-bold text-neo-white">
                {t('adventure.bossRush.timeTaken')}
              </span>
            </div>
            <span className="text-lg font-black text-neo-cyan tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* Banner Ads — CrazyGames (web iframe) / AdMob (native) */}
        <div className="hidden md:block mb-4">
          <CrazyGamesBanner size="728x90" />
        </div>
        <div className="md:hidden mb-4">
          <CrazyGamesBanner size="320x50" />
        </div>

        {/* R5 — Rewarded continue on failure */}
        {!isVictory && rewarded.canShowAd && !rewarded.isDailyLimitReached && (
          <button
            type="button"
            data-testid="rewarded-continue-btn"
            onClick={() => rewarded.showAd()}
            disabled={rewarded.status === 'loading' || rewarded.status === 'showing'}
            className={cn(
              'w-full mb-3 py-3 px-4',
              'flex items-center justify-center gap-2',
              'bg-neo-purple text-neo-white',
              'font-black text-sm uppercase tracking-tight',
              'border-3 border-neo-black rounded-neo shadow-hard',
              'hover:-translate-y-0.5 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Swords className="w-4 h-4" />
            {t('adventure.bossRush.watchAdToContinue')}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <AdaptiveMotion.button
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className={cn(
              'flex-1 py-3 px-4',
              'bg-neo-orange text-neo-black',
              'font-black text-sm uppercase tracking-tight',
              'border-3 border-neo-black rounded-neo shadow-hard',
              'hover:shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all duration-150'
            )}
          >
            {t('adventure.bossRush.tryAgain')}
          </AdaptiveMotion.button>

          <AdaptiveMotion.button
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className={cn(
              'flex-1 py-3 px-4',
              'bg-neo-white/10 text-neo-white',
              'font-black text-sm uppercase tracking-tight',
              'border-3 border-neo-white/30 rounded-neo',
              'hover:bg-neo-white/20',
              'transition-all duration-150'
            )}
          >
            {t('adventure.bossRush.backToHub')}
          </AdaptiveMotion.button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
});

BossRushResults.displayName = 'BossRushResults';

export default BossRushResults;
