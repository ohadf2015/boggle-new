'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBattlePass } from '@/hooks/useBattlePass';
import BattlePassRewardCard from './BattlePassRewardCard';
import { Crown, Clock, Star } from 'lucide-react';

export default function BattlePassTrack() {
  const { t } = useLanguage();
  const {
    currentTier,
    currentXP,
    xpToNextTier,
    progress,
    isPremium,
    claimedTiers,
    tiers,
    claimReward,
    daysRemaining,
    season,
  } = useBattlePass();

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTierRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current tier on mount
  useEffect(() => {
    if (currentTierRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = currentTierRef.current;
      const offset = element.offsetLeft - container.clientWidth / 2 + element.clientWidth / 2;
      container.scrollTo({ left: offset, behavior: 'smooth' });
    }
  }, [currentTier]);

  return (
    <div className="border-3 border-neo-black rounded-neo shadow-hard bg-neo-cream overflow-hidden">
      {/* Header */}
      <div className="bg-linear-to-r from-neo-purple to-neo-pink p-4 border-b-3 border-neo-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-neo-yellow" />
            <h2 className="font-black text-lg text-neo-white">
              {t('battlePass.title')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-neo-white text-sm">
              <Clock className="w-4 h-4" />
              <span>
                {daysRemaining} {t('battlePass.daysLeft')}
              </span>
            </div>
            {!isPremium && (
              <button className="bg-neo-yellow text-neo-black font-bold text-sm px-3 py-1 border-2 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all">
                {t('battlePass.upgrade')} - {season.premiumCost}
                <Star className="w-3 h-3 inline-block ms-1" />
              </button>
            )}
          </div>
        </div>

        {/* XP progress */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs font-bold text-neo-white">
            <span>
              {t('battlePass.tier')} {currentTier}/{season.totalTiers}
            </span>
            <span>
              {currentXP} XP {xpToNextTier > 0 && `(${xpToNextTier} ${t('battlePass.toNext')})`}
            </span>
          </div>
          <div className="h-2.5 border-2 border-neo-black rounded-full overflow-hidden bg-neo-black/20">
            <div
              className="h-full bg-neo-yellow rounded-full transition-all duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable tier track */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 p-4 min-w-max">
          {tiers.map((tierData) => {
            const isActive = tierData.tier === currentTier;
            const isUnlocked = currentTier >= tierData.tier;
            const isFreeRewardClaimed = claimedTiers.includes(tierData.tier);
            const isPremiumRewardClaimed = claimedTiers.includes(tierData.tier + 1000);

            return (
              <div
                key={tierData.tier}
                ref={isActive ? currentTierRef : undefined}
                className={`flex flex-col items-center gap-1.5 px-1 ${
                  isActive ? 'scale-105' : ''
                }`}
              >
                {/* Free reward (top) */}
                <div className="h-20 flex items-end">
                  {tierData.freeReward ? (
                    <BattlePassRewardCard
                      reward={tierData.freeReward}
                      tier={tierData.tier}
                      isUnlocked={isUnlocked}
                      isClaimed={isFreeRewardClaimed}
                      isPremiumSlot={false}
                      onClaim={() => claimReward(tierData.tier)}
                    />
                  ) : (
                    <div className="w-16 h-20" />
                  )}
                </div>

                {/* Tier circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full border-3 border-neo-black flex items-center justify-center font-black text-sm
                    ${isActive ? 'bg-neo-yellow shadow-hard ring-2 ring-neo-yellow/50' : ''}
                    ${isUnlocked && !isActive ? 'bg-neo-green' : ''}
                    ${!isUnlocked ? 'bg-gray-200' : ''}
                  `}
                >
                  {tierData.tier}
                </div>

                {/* Premium reward (bottom) */}
                <div className="h-20 flex items-start">
                  <BattlePassRewardCard
                    reward={tierData.premiumReward}
                    tier={tierData.tier}
                    isUnlocked={isUnlocked && isPremium}
                    isClaimed={isPremiumRewardClaimed}
                    isPremiumSlot={true}
                    onClaim={() => claimReward(tierData.tier + 1000)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
