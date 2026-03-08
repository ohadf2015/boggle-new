'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import type { GameTypeFilter } from '../types';

interface GamesFiltersProps {
  languageFilter: string;
  gameTypeFilter: GameTypeFilter;
  rankedFilter: string;
  onLanguageChange: (value: string) => void;
  onGameTypeChange: (value: GameTypeFilter) => void;
  onRankedChange: (value: string) => void;
  t: (key: string) => string;
}

export function GamesFilters({
  languageFilter,
  gameTypeFilter,
  rankedFilter,
  onLanguageChange,
  onGameTypeChange,
  onRankedChange,
  t,
}: GamesFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 bg-slate-800/50 rounded-neo border-neo border-black p-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">
          {t('admin.todayGames.filters')}:
        </span>
      </div>

      <select
        value={languageFilter}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
      >
        <option value="all">{t('admin.todayGames.allLanguages')}</option>
        <option value="en">🇺🇸 English</option>
        <option value="he">🇮🇱 Hebrew</option>
        <option value="sv">🇸🇪 Swedish</option>
        <option value="ja">🇯🇵 Japanese</option>
        <option value="es">🇪🇸 Spanish</option>
      </select>

      <select
        value={gameTypeFilter}
        onChange={(e) => onGameTypeChange(e.target.value as GameTypeFilter)}
        className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
      >
        <option value="all">{t('admin.todayGames.allTypes')}</option>
        <option value="multiplayer">{t('admin.todayGames.multiplayer')}</option>
        <option value="word_hunt">{t('admin.todayGames.wordHunt')}</option>
        <option value="daily_challenge">{t('admin.todayGames.daily')}</option>
        <option value="drill">{t('admin.todayGames.drills')}</option>
      </select>

      <select
        value={rankedFilter}
        onChange={(e) => onRankedChange(e.target.value)}
        className="bg-slate-700 text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
      >
        <option value="all">{t('admin.todayGames.allModes')}</option>
        <option value="true">{t('admin.todayGames.rankedOnly')}</option>
        <option value="false">{t('admin.todayGames.casualOnly')}</option>
      </select>
    </div>
  );
}
