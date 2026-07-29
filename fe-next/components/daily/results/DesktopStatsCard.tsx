/**
 * DesktopStatsCard Component
 * Desktop-only statistics summary card
 */

'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { WordHuntStats } from './types';

export interface DesktopStatsCardProps {
  stats: WordHuntStats | null;
  t: (key: string) => string;
}

export const DesktopStatsCard: React.FC<DesktopStatsCardProps> = ({ stats, t }) => (
  <div className="bg-neo-navy border-3 border-neo-black rounded-neo p-4 shadow-hard">
    <h3 className="text-sm font-black uppercase text-white mb-3 flex items-center gap-2">
      <BarChart3 className="w-4 h-4 text-neo-cyan" />
      {t('wordHunt.stats.title')}
    </h3>
    {stats ? (
      <div className="space-y-3">
        {stats.yourStats && (
          <div className="text-center">
            <span className="text-3xl font-black text-neo-lime">{stats.yourStats.percentile}%</span>
            <span className="text-white text-sm block">{t('wordHunt.stats.betterThan')}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white/10 rounded-neo p-2">
            <div className="text-lg font-black text-white">{stats.totalPlayers}</div>
            <div className="text-[10px] text-white uppercase font-bold">{t('wordHunt.stats.totalPlayers')}</div>
          </div>
          <div className="bg-white/10 rounded-neo p-2">
            <div className="text-lg font-black text-white">{Math.round(stats.solveRate)}%</div>
            <div className="text-[10px] text-white uppercase font-bold">{t('wordHunt.stats.solveRate')}</div>
          </div>
        </div>
      </div>
    ) : (
      <div className="text-white text-sm">{t('common.loading')}</div>
    )}
  </div>
);

export default DesktopStatsCard;
