'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import type { LeagueTier, LeagueStanding } from '@/hooks/useLeague';

const ZONE_STYLES: Record<string, string> = {
  promotion: 'bg-green-900/20 border-l-4 border-l-green-500',
  safe: '',
  relegation: 'bg-red-900/20 border-l-4 border-l-red-500',
};

interface LeagueBannerProps {
  standings: LeagueStanding[];
  myUserId: string;
  tier: LeagueTier;
}

export function LeagueBanner({ standings, myUserId, tier }: LeagueBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="border-3 border-black rounded-neo shadow-hard bg-neo-navy/80 overflow-hidden">
      <div className="p-3 border-b-3 border-black bg-neo-navy">
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t('league.standings')}
        </h2>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AdaptiveAnimatePresence>
          {standings.map((s) => {
            const isMe = s.userId === myUserId;
            return (
              <AdaptiveMotion.div
                key={s.userId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: s.position * 0.02 }}
                className={`flex items-center justify-between px-3 py-2 ${ZONE_STYLES[s.zone]} ${
                  isMe ? 'bg-neo-yellow/10 font-bold' : ''
                }`}
                data-zone={s.zone}
                data-is-me={isMe ? 'true' : undefined}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-neo-white font-mono text-sm">
                    {s.position}
                  </span>
                  <span className={`text-sm ${isMe ? 'text-neo-yellow' : 'text-neo-white'}`}>
                    {s.displayName}
                  </span>
                </div>
                <span className="font-mono text-sm text-neo-yellow">{s.weeklyXp}</span>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveAnimatePresence>
      </div>

      <div className="p-2 border-t-3 border-black bg-neo-navy/50 flex justify-between text-xs text-neo-white">
        <span className="text-green-400">{t('league.promotionZone')}</span>
        <span>{t('league.safeZone')}</span>
        <span className="text-red-400">{t('league.relegationZone')}</span>
      </div>
    </div>
  );
}
