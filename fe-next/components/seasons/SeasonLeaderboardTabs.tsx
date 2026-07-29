'use client';

import React from 'react';
import { Trophy, Clock, Archive } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export type SeasonTabKey = 'season' | 'allTime' | 'pastSeasons';

export interface SeasonLeaderboardTabsProps {
  active: SeasonTabKey;
  onChange: (key: SeasonTabKey) => void;
  className?: string;
}

const TABS: ReadonlyArray<{
  key: SeasonTabKey;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  { key: 'season',      labelKey: 'season.thisSeason',  icon: Trophy,  activeClass: 'bg-neo-lime text-black' },
  { key: 'allTime',     labelKey: 'season.allTime',     icon: Clock,   activeClass: 'bg-neo-cyan text-black' },
  { key: 'pastSeasons', labelKey: 'season.pastSeasons', icon: Archive, activeClass: 'bg-neo-purple text-neo-white' },
];

export const SeasonLeaderboardTabs: React.FC<SeasonLeaderboardTabsProps> = ({
  active,
  onChange,
  className = '',
}) => {
  const { t } = useLanguage();

  return (
    <div
      role="tablist"
      aria-label="Leaderboard scope"
      className={`
        inline-flex gap-1 p-1 rounded-neo border-neo border-black
        bg-neo-navy shadow-hard-sm overflow-x-auto
        ${className}
      `}
    >
      {TABS.map(({ key, labelKey, icon: Icon, activeClass }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-2
              rounded-neo border-neo border-black font-neo-display text-sm
              transition-all motion-reduce:transition-none
              hover:shadow-hard
              active:translate-y-0.5 active:shadow-hard-pressed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
              ${isActive
                ? `${activeClass} shadow-hard-sm`
                : 'bg-neo-navy-light text-neo-white hover:bg-neo-navy'}
            `}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
};
