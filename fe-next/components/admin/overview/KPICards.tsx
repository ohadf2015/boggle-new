'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Users, Gamepad2, UserPlus, TrendingUp, BookOpen } from 'lucide-react';

interface StatsData {
  overview: { totalPlayers: number; totalGames: number; totalWords: number; totalGameTimeHours: number };
  activity: { gamesToday: number; uniquePlayersToday: number; uniquePlayersWeek: number; uniquePlayersMonth: number; signupsToday: number; signupsWeek: number };
  languages: Record<string, number>;
}

interface KPICardsProps {
  stats: StatsData | null;
}

interface KPICard {
  labelKey: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function KPICards({ stats }: KPICardsProps) {
  const { t } = useLanguage();

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`kpi-skel-${i}`}
            data-testid="kpi-skeleton"
            className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  const stickiness = stats.activity.uniquePlayersMonth > 0
    ? ((stats.activity.uniquePlayersToday / stats.activity.uniquePlayersMonth) * 100).toFixed(1)
    : '0';

  const cards: KPICard[] = [
    {
      labelKey: 'admin.kpi.dau',
      value: stats.activity.uniquePlayersToday,
      icon: Users,
      color: 'text-neo-cyan',
      subtitle: `WAU: ${formatNumber(stats.activity.uniquePlayersWeek)}`,
    },
    {
      labelKey: 'admin.kpi.gamesToday',
      value: stats.activity.gamesToday,
      icon: Gamepad2,
      color: 'text-neo-lime',
    },
    {
      labelKey: 'admin.kpi.signupsToday',
      value: stats.activity.signupsToday,
      icon: UserPlus,
      color: 'text-neo-orange',
      subtitle: `${t('admin.kpi.thisWeek')}: ${stats.activity.signupsWeek}`,
    },
    {
      labelKey: 'admin.kpi.stickiness',
      value: `${stickiness}%`,
      icon: TrendingUp,
      color: 'text-neo-pink',
      subtitle: 'DAU/MAU',
    },
    {
      labelKey: 'admin.kpi.totalPlayers',
      value: formatNumber(stats.overview.totalPlayers),
      icon: Users,
      color: 'text-blue-400',
    },
    {
      labelKey: 'admin.kpi.totalWords',
      value: formatNumber(stats.overview.totalWords),
      icon: BookOpen,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.labelKey}
            className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-3 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('w-4 h-4', card.color)} />
              <span className="text-xs text-slate-400 truncate">{t(card.labelKey)}</span>
            </div>
            <div className="text-xl sm:text-2xl font-neo-display text-neo-white font-bold">
              {card.value}
            </div>
            {card.subtitle && (
              <div className="text-xs text-slate-500 mt-0.5">{card.subtitle}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
