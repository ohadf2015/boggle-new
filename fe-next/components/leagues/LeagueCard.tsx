'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { LeagueTier, LeagueStanding } from '@/hooks/useLeague';

const TIER_COLORS: Record<LeagueTier, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-300',
  gold: 'text-yellow-400',
  diamond: 'text-cyan-300',
  ruby: 'text-red-400',
};

const TIER_BG: Record<LeagueTier, string> = {
  bronze: 'bg-amber-900/30',
  silver: 'bg-neo-navy-elevated/30',
  gold: 'bg-yellow-900/30',
  diamond: 'bg-cyan-900/30',
  ruby: 'bg-red-900/30',
};

interface LeagueCardProps {
  tier: LeagueTier;
  myPosition: number | null;
  myXp: number;
  topStandings: LeagueStanding[];
}

export function LeagueCard({ tier, myPosition, myXp, topStandings }: LeagueCardProps) {
  const { t } = useLanguage();

  if (myPosition === null && topStandings.length === 0) {
    return (
      <div className="border-neo rounded-neo bg-neo-navy/50 p-4 text-center">
        <p className="text-neo-white">{t('league.noLeague')}</p>
      </div>
    );
  }

  const tierKey = `league.${tier}` as const;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-3 border-black rounded-neo shadow-hard-sm ${TIER_BG[tier]} p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-neo-display text-lg font-bold ${TIER_COLORS[tier]}`}>
          {t(tierKey)}
        </h3>
        {myPosition !== null && (
          <div className="flex items-center gap-2">
            <span className="text-neo-white text-sm">{t('league.yourPosition')}</span>
            <span className="font-neo-display text-xl font-bold text-neo-white">#{myPosition}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-neo-white text-sm">{t('league.xp')}</span>
        <span className="font-bold text-neo-yellow">{myXp}</span>
      </div>

      {topStandings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-neo-white uppercase">{t('league.standings')}</p>
          {topStandings.map((s) => (
            <div key={s.userId} className="flex items-center justify-between text-sm">
              <span className="text-neo-white">
                <span className="text-neo-white me-2">#{s.position}</span>
                {s.displayName}
              </span>
              <span className="text-neo-yellow font-mono">{s.weeklyXp}</span>
            </div>
          ))}
        </div>
      )}
    </AdaptiveMotion.div>
  );
}
