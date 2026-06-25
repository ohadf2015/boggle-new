'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { LeagueTier, LeagueZone } from '@/hooks/useLeague';

const CrazyGamesBanner = dynamic(() => import('@/components/CrazyGamesBanner'), { ssr: false });

const ZONE_MESSAGES: Record<LeagueZone, string> = {
  promotion: 'league.promoted',
  safe: 'league.stayed',
  relegation: 'league.relegated',
};

const ZONE_COLORS: Record<LeagueZone, string> = {
  promotion: 'text-green-400',
  safe: 'text-neo-white',
  relegation: 'text-red-400',
};

interface LeagueResultsProps {
  tier: LeagueTier;
  position: number;
  zone: LeagueZone;
  coinsEarned: number;
  onClose: () => void;
}

export function LeagueResults({ tier, position, zone, coinsEarned, onClose }: LeagueResultsProps) {
  const { t } = useLanguage();
  const { showInterstitial } = useInterstitialAd();
  const { submitLeaderboardScore } = useCrazyGames();

  // Ads + leaderboard on mount
  useEffect(() => {
    showInterstitial('league-complete');
    if (coinsEarned > 0) {
      submitLeaderboardScore(coinsEarned);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className="border-3 border-black rounded-neo shadow-hard-lg bg-neo-navy p-6 max-w-sm w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-300"
      >
        <h2 className="font-neo-display text-2xl font-bold text-neo-white text-center mb-4">
          {t('league.finalResults')}
        </h2>

        <div className="text-center mb-4">
          <p className={`font-neo-display text-3xl font-bold ${ZONE_COLORS[zone]}`}>
            {t(ZONE_MESSAGES[zone])}
          </p>
          <p className="text-neo-white mt-1">
            #{position} in {t(`league.${tier}`)}
          </p>
        </div>

        <div className="border-3 border-black rounded-neo bg-neo-navy/50 p-4 text-center mb-4">
          <p className="text-sm text-neo-white">{t('league.coinsEarned')}</p>
          <p className="font-neo-display text-2xl font-bold text-neo-yellow">{coinsEarned}</p>
        </div>

        {/* Inline banner ad (web iframe; native shows no inline banner) */}
        <div className="mb-4">
          <CrazyGamesBanner size="300x250" />
        </div>

        <button
          onClick={onClose}
          className="w-full border-3 border-black rounded-neo bg-neo-yellow text-black font-bold py-3 shadow-hard-sm active:shadow-hard-pressed active:translate-y-[2px] transition-all"
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}
