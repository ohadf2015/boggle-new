'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import type { GameTypeFilter, GameLogSource } from '../types';
import { DATE_RANGES, type DateRange } from '../constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

      <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRange)}>
        <SelectTrigger className="h-8 w-auto bg-neo-navy-elevated text-neo-white text-sm border-black px-3 py-1.5" aria-label={t('admin.todayGames.dateRange', 'Date range')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range} value={range}>
              {t(`admin.todayGames.range.${range}`, DATE_RANGE_FALLBACK[range])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={languageFilter} onValueChange={onLanguageChange} disabled={logSource === 'analytics'}>
        <SelectTrigger
          className="h-8 w-auto bg-neo-navy-elevated text-neo-white text-sm border-black px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={logSource === 'analytics' ? t('admin.todayGames.source.noLanguage', 'Language is not recorded per play in the all-plays source') : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.todayGames.allLanguages')}</SelectItem>
          <SelectItem value="en">🇺🇸 English</SelectItem>
          <SelectItem value="he">🇮🇱 Hebrew</SelectItem>
          <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
          <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
          <SelectItem value="es">🇪🇸 Spanish</SelectItem>
        </SelectContent>
      </Select>

      <Select value={gameTypeFilter} onValueChange={(v) => onGameTypeChange(v as GameTypeFilter)}>
        <SelectTrigger className="h-8 w-auto bg-neo-navy-elevated text-neo-white text-sm border-black px-3 py-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.todayGames.allTypes')}</SelectItem>
          <SelectItem value="multiplayer">{t('admin.todayGames.multiplayer')}</SelectItem>
          <SelectItem value="word_hunt">{t('admin.todayGames.wordHunt')}</SelectItem>
          <SelectItem value="daily_challenge">{t('admin.todayGames.daily')}</SelectItem>
          <SelectItem value="drill">{t('admin.todayGames.drills')}</SelectItem>
          <SelectItem value="blast">{t('admin.todayGames.blast', 'Blast')}</SelectItem>
          <SelectItem value="word_wheel">{t('admin.todayGames.wordWheel', 'Word Wheel')}</SelectItem>
          <SelectItem value="practice">{t('admin.todayGames.practice', 'Practice')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={rankedFilter} onValueChange={onRankedChange}>
        <SelectTrigger className="h-8 w-auto bg-neo-navy-elevated text-neo-white text-sm border-black px-3 py-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.todayGames.allModes')}</SelectItem>
          <SelectItem value="true">{t('admin.todayGames.rankedOnly')}</SelectItem>
          <SelectItem value="false">{t('admin.todayGames.casualOnly')}</SelectItem>
        </SelectContent>
      </Select>

      {/* Data source toggle — placed last so existing filter ordering is preserved. */}
      <Select value={logSource} onValueChange={(v) => onLogSourceChange(v as GameLogSource)}>
        <SelectTrigger
          className="h-8 w-auto ms-auto bg-neo-navy-elevated text-neo-white text-sm border-black px-3 py-1.5"
          aria-label={t('admin.todayGames.source.label', 'Data source')}
          title={t('admin.todayGames.source.hint', 'Analytics = every play incl. anonymous; Tables = per-product records')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="analytics">{t('admin.todayGames.source.analyticsAll', 'All plays (incl. guests)')}</SelectItem>
          <SelectItem value="tables">{t('admin.todayGames.source.productTables', 'Product tables')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
