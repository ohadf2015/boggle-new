'use client';

import React from 'react';
import {
  Gamepad2, Trophy, Target, Brain, Puzzle, Bomb, CircleDot, GraduationCap,
  Crosshair, Shuffle, Compass, Link2, Building2, User,
} from 'lucide-react';
import type { GamesStats, ModeBreakdownEntry } from '../types';
import { StatCard } from './StatCard';

interface StatsBarProps {
  stats: GamesStats;
  total: number;
  modeBreakdown?: ModeBreakdownEntry[];
  t: (key: string, fallback?: string) => string;
}

// Icon per canonical mode bucket key.
const BUCKET_ICON: Record<string, React.ReactNode> = {
  multiplayer: <Trophy className="w-5 h-5 text-blue-400" />,
  wordHunt: <Target className="w-5 h-5 text-green-400" />,
  classic: <Gamepad2 className="w-5 h-5 text-blue-300" />,
  wordWheel: <CircleDot className="w-5 h-5 text-neo-cyan" />,
  survival: <Crosshair className="w-5 h-5 text-neo-pink" />,
  random: <Shuffle className="w-5 h-5 text-purple-300" />,
  blast: <Bomb className="w-5 h-5 text-neo-pink" />,
  adventure: <Compass className="w-5 h-5 text-amber-400" />,
  connections: <Link2 className="w-5 h-5 text-sky-400" />,
  wordTower: <Building2 className="w-5 h-5 text-orange-300" />,
  singleplayer: <User className="w-5 h-5 text-slate-300" />,
};

/**
 * Stats cards. When the API returns a dynamic `modeBreakdown` (analytics source) we
 * render Total + one card per non-zero mode bucket — accurate counts that match the
 * real gameMode taxonomy. Falls back to the legacy fixed cards otherwise.
 */
export function StatsBar({ stats, total, modeBreakdown, t }: StatsBarProps) {
  if (modeBreakdown && modeBreakdown.length > 0) {
    const visible = modeBreakdown.filter((b) => b.count > 0).sort((a, b) => b.count - a.count);
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          label={t('admin.todayGames.totalGames', 'Total')}
          value={total}
          icon={<Gamepad2 className="w-5 h-5 text-neo-lime" />}
        />
        {visible.map((b) => (
          <StatCard
            key={b.key}
            label={t(`admin.todayGames.${b.labelKey}`, b.label)}
            value={b.count}
            icon={BUCKET_ICON[b.key] ?? <Gamepad2 className="w-5 h-5 text-slate-400" />}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      <StatCard label={t('admin.todayGames.totalGames')} value={stats.total} icon={<Gamepad2 className="w-5 h-5 text-neo-lime" />} />
      <StatCard label={t('admin.todayGames.multiplayer')} value={stats.multiplayer} icon={<Trophy className="w-5 h-5 text-blue-400" />} />
      <StatCard label={t('admin.todayGames.wordHunt')} value={stats.wordHunt} icon={<Target className="w-5 h-5 text-green-400" />} />
      <StatCard label={t('admin.todayGames.daily')} value={stats.daily} icon={<Puzzle className="w-5 h-5 text-purple-400" />} />
      <StatCard label={t('admin.todayGames.drills')} value={stats.drills} icon={<Brain className="w-5 h-5 text-amber-400" />} />
      <StatCard label={t('admin.todayGames.blast', 'Blast')} value={stats.blast} icon={<Bomb className="w-5 h-5 text-neo-pink" />} />
      <StatCard label={t('admin.todayGames.wordWheel', 'Word Wheel')} value={stats.wordWheel} icon={<CircleDot className="w-5 h-5 text-neo-cyan" />} />
      <StatCard label={t('admin.todayGames.practice', 'Practice')} value={stats.practice} icon={<GraduationCap className="w-5 h-5 text-sky-400" />} />
    </div>
  );
}
