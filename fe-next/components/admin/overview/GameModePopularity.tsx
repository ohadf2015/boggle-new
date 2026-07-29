'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Users, Calendar, Map, Bomb } from 'lucide-react';
import type { GameModeStats, LandingGameMode } from '@/lib/landing/fetchGameModeStats';

const MODE_CONFIG: Record<LandingGameMode, { icon: React.ElementType; color: string; barColor: string }> = {
  practice: { icon: User, color: 'text-neo-cyan', barColor: 'bg-neo-cyan' },
  arena: { icon: Users, color: 'text-neo-pink', barColor: 'bg-neo-pink' },
  daily: { icon: Calendar, color: 'text-neo-lime', barColor: 'bg-neo-lime' },
  adventure: { icon: Map, color: 'text-neo-lime', barColor: 'bg-neo-lime' },
  blast: { icon: Bomb, color: 'text-neo-cyan', barColor: 'bg-neo-cyan' },
};

const MODE_LABEL_KEYS: Record<LandingGameMode, string> = {
  practice: 'landing.singlePlayer',
  arena: 'landing.multiplayer',
  daily: 'landing.dailyChallenge',
  adventure: 'landing.adventureMode',
  blast: 'landing.blastMode',
};

export function GameModePopularity() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<GameModeStats[] | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/game-mode-stats?days=${days}`)
      .then(res => res.json())
      .then(data => setStats(data.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [days]);

  const maxCount = stats ? Math.max(...stats.map(s => s.playCount), 1) : 1;
  const totalGames = stats ? stats.reduce((sum, s) => sum + s.playCount, 0) : 0;

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-neo-white font-bold text-sm uppercase tracking-wider">
          {t('admin.gameModePopularity') || 'Game Mode Popularity'}
        </h3>
        <div className="flex gap-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded-neo border border-black transition-colors',
                days === d
                  ? 'bg-neo-cyan text-neo-black'
                  : 'bg-neo-navy-elevated text-neo-white hover:bg-slate-600'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-8 bg-neo-navy-elevated/50 rounded-neo animate-pulse" />
          ))}
        </div>
      ) : stats && stats.length > 0 ? (
        <div className="space-y-2.5">
          {stats.map((stat, index) => {
            const config = MODE_CONFIG[stat.mode];
            const Icon = config.icon;
            const pct = totalGames > 0 ? ((stat.playCount / totalGames) * 100).toFixed(1) : '0';
            const barWidth = maxCount > 0 ? (stat.playCount / maxCount) * 100 : 0;

            return (
              <div key={stat.mode} className="flex items-center gap-2">
                <span className="text-neo-white text-xs font-mono w-4 text-right">
                  {index + 1}
                </span>
                <Icon className={cn('w-4 h-4 shrink-0', config.color)} />
                <span className="text-neo-white text-xs font-bold w-24 truncate">
                  {t(MODE_LABEL_KEYS[stat.mode]) || stat.mode}
                </span>
                <div className="flex-1 h-5 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
                  <div
                    className={cn('h-full rounded-sm transition-all duration-500', config.barColor)}
                    style={{ width: `${barWidth}%`, opacity: 0.8 }}
                  />
                </div>
                <span className="text-neo-white text-xs font-mono w-16 text-right">
                  {stat.playCount.toLocaleString()}
                </span>
                <span className="text-neo-white text-xs font-mono w-12 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}

          <div className="border-t border-slate-700 pt-2 mt-3 flex justify-between text-xs text-neo-white">
            <span>{t('admin.totalGames') || 'Total'}: {totalGames.toLocaleString()}</span>
            <span>{t('admin.landingCardOrder') || 'Landing card order'}: {stats.filter(s => s.mode !== 'blast').map(s => s.mode).join(' → ')}</span>
          </div>
        </div>
      ) : (
        <p className="text-neo-white text-xs">{t('admin.noData') || 'No data available'}</p>
      )}
    </div>
  );
}
