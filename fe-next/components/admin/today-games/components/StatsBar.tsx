'use client';

import React from 'react';
import { Gamepad2, Trophy, Target, Brain, Puzzle } from 'lucide-react';
import type { GamesStats } from '../types';
import { StatCard } from './StatCard';

interface StatsBarProps {
  stats: GamesStats;
  t: (key: string) => string;
}

export function StatsBar({ stats, t }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <StatCard
        label={t('admin.todayGames.totalGames')}
        value={stats.total}
        icon={<Gamepad2 className="w-5 h-5 text-neo-lime" />}
      />
      <StatCard
        label={t('admin.todayGames.multiplayer')}
        value={stats.multiplayer}
        icon={<Trophy className="w-5 h-5 text-blue-400" />}
      />
      <StatCard
        label={t('admin.todayGames.wordHunt')}
        value={stats.wordHunt}
        icon={<Target className="w-5 h-5 text-green-400" />}
      />
      <StatCard
        label={t('admin.todayGames.daily')}
        value={stats.daily}
        icon={<Puzzle className="w-5 h-5 text-purple-400" />}
      />
      <StatCard
        label={t('admin.todayGames.drills')}
        value={stats.drills}
        icon={<Brain className="w-5 h-5 text-amber-400" />}
      />
    </div>
  );
}
