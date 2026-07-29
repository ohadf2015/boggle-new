'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import type { GameTypeFilter, GameLogSource } from '../types';
import { DATE_RANGES, type DateRange } from '../constants';

interface GamesFiltersProps {
  languageFilter: string;
  gameTypeFilter: GameTypeFilter;
  rankedFilter: string;
  dateRange: DateRange;
  logSource: GameLogSource;
  onLanguageChange: (value: string) => void;
  onGameTypeChange: (value: GameTypeFilter) => void;
  onRankedChange: (value: string) => void;
  onDateRangeChange: (value: DateRange) => void;
  onLogSourceChange: (value: GameLogSource) => void;
  t: (key: string, fallback?: string) => string;
}

const DATE_RANGE_FALLBACK: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

export function GamesFilters({
  languageFilter,
  gameTypeFilter,
  rankedFilter,
  dateRange,
  logSource,
  onLanguageChange,
  onGameTypeChange,
  onRankedChange,
  onDateRangeChange,
  onLogSourceChange,
  t,
}: GamesFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">
          {t('admin.todayGames.filters')}:
        </span>
      </div>

      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRange)}
        className="bg-neo-navy-elevated text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
        aria-label={t('admin.todayGames.dateRange', 'Date range')}
      >
        {DATE_RANGES.map((range) => (
          <option key={range} value={range}>
            {t(`admin.todayGames.range.${range}`, DATE_RANGE_FALLBACK[range])}
          </option>
        ))}
      </select>

      <select
        value={languageFilter}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={logSource === 'analytics'}
        title={logSource === 'analytics' ? t('admin.todayGames.source.noLanguage', 'Language is not recorded per play in the all-plays source') : undefined}
        className="bg-neo-navy-elevated text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
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
        className="bg-neo-navy-elevated text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
      >
        <option value="all">{t('admin.todayGames.allTypes')}</option>
        <option value="multiplayer">{t('admin.todayGames.multiplayer')}</option>
        <option value="word_hunt">{t('admin.todayGames.wordHunt')}</option>
        <option value="daily_challenge">{t('admin.todayGames.daily')}</option>
        <option value="drill">{t('admin.todayGames.drills')}</option>
        <option value="blast">{t('admin.todayGames.blast', 'Blast')}</option>
        <option value="word_wheel">{t('admin.todayGames.wordWheel', 'Word Wheel')}</option>
        <option value="practice">{t('admin.todayGames.practice', 'Practice')}</option>
      </select>

      <select
        value={rankedFilter}
        onChange={(e) => onRankedChange(e.target.value)}
        className="bg-neo-navy-elevated text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
      >
        <option value="all">{t('admin.todayGames.allModes')}</option>
        <option value="true">{t('admin.todayGames.rankedOnly')}</option>
        <option value="false">{t('admin.todayGames.casualOnly')}</option>
      </select>

      {/* Data source toggle — placed last so existing filter ordering is preserved. */}
      <select
        value={logSource}
        onChange={(e) => onLogSourceChange(e.target.value as GameLogSource)}
        className="ms-auto bg-neo-navy-elevated text-neo-white text-sm rounded-neo border-neo border-black px-3 py-1.5"
        aria-label={t('admin.todayGames.source.label', 'Data source')}
        title={t('admin.todayGames.source.hint', 'Analytics = every play incl. anonymous; Tables = per-product records')}
      >
        <option value="analytics">{t('admin.todayGames.source.analyticsAll', 'All plays (incl. guests)')}</option>
        <option value="tables">{t('admin.todayGames.source.productTables', 'Product tables')}</option>
      </select>
    </div>
  );
}
