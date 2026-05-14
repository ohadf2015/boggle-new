'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Swords } from 'lucide-react';

export interface ScoreGauntletBannerProps {
  challengerName: string | null;
  challengerScore: number | null;
  challengerEmoji: string | null;
  t: (key: string) => string;
}

export const ScoreGauntletBanner: React.FC<ScoreGauntletBannerProps> = ({
  challengerName,
  challengerScore,
  challengerEmoji,
  t,
}) => {
  if (!challengerName || challengerScore === null) return null;

  return (
    <m.div
      data-testid="score-gauntlet-banner"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-linear-to-r from-neo-pink/20 to-neo-orange/20 border-3 border-neo-pink rounded-neo shadow-hard p-3 mb-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{challengerEmoji || '🎯'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-neo-pink font-black uppercase tracking-widest flex items-center gap-1">
            <Swords className="w-3 h-3" />
            {t('wordHunt.gauntlet.challenge')}
          </div>
          <div className="text-neo-white font-bold text-sm">
            <span className="text-neo-pink">{challengerName}</span>
            {' '}
            {t('wordHunt.gauntlet.scored')}
            {' '}
            <span className="text-neo-orange">{challengerScore}</span>
            {' '}
            {t('wordHunt.gauntlet.pts')}
            {' — '}
            {t('wordHunt.gauntlet.canYouBeat')}
          </div>
        </div>
        <div className="shrink-0">
          <Swords className="w-5 h-5 text-neo-pink" aria-hidden="true" />
        </div>
      </div>
    </m.div>
  );
};

export default ScoreGauntletBanner;
