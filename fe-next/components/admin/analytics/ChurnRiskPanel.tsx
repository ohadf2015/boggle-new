'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface ChurnPlayer {
  id: string;
  username: string;
  display_name?: string;
  last_game_at: string;
  total_games: number;
}

interface ChurnRiskPanelProps {
  players: ChurnPlayer[] | null;
  total: number;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function riskTier(days: number): { label: string; color: string } {
  if (days >= 30) return { label: 'Churned', color: 'bg-red-500/20 text-red-400' };
  if (days >= 14) return { label: 'At Risk', color: 'bg-orange-500/20 text-orange-400' };
  if (days >= 7) return { label: 'Cooling', color: 'bg-yellow-500/20 text-yellow-400' };
  return { label: 'Healthy', color: 'bg-emerald-500/20 text-emerald-400' };
}

export function ChurnRiskPanel({ players, total }: ChurnRiskPanelProps) {
  const { t } = useLanguage();

  if (!players) {
    return (
      <div data-testid="churn-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-neo-orange" />
          {t('admin.analytics.churnTitle')}
        </h3>
        <span className="text-xs text-slate-400">
          {t('admin.analytics.churnTotal')}: <span className="text-neo-white font-bold">{total}</span>
        </span>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-slate-500">{t('admin.analytics.noChurnRisk')}</p>
      ) : (
        <div className="space-y-1.5">
          {players.slice(0, 10).map((player) => {
            const days = daysSince(player.last_game_at);
            const tier = riskTier(days);

            return (
              <div
                key={player.id}
                data-testid="churn-player-row"
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-neo-navy-elevated/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-neo-white truncate">
                    {player.display_name || player.username}
                  </span>
                  <span className="text-xs text-slate-500">
                    {player.total_games} {t('admin.analytics.games')}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{days}d</span>
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', tier.color)}>
                    {tier.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
