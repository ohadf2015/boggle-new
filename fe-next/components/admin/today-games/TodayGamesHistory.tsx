'use client';

import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { PageLoader } from '@/components/ui/PageLoader';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
import type { TodayGamesHistoryProps } from './types';

// Hooks
import { useTodayGames } from './hooks';

// Components
import { StatsBar, GamesFilters, VirtualGamesList, EmptyState } from './components';

export function TodayGamesHistory({ authToken }: TodayGamesHistoryProps) {
  const { t } = useLanguage();

  const {
    data,
    filteredGames,
    filteredGameGroups,
    unbucketedModes,
    truncated,
    stats,
    lastRefresh,
    loading,
    error,
    languageFilter,
    gameTypeFilter,
    rankedFilter,
    dateRange,
    logSource,
    setLanguageFilter,
    setGameTypeFilter,
    setRankedFilter,
    setDateRange,
    setLogSource,
    page,
    pageSize,
    setPage,
    refresh,
  } = useTodayGames({ authToken });

  // Initial loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <PageLoader size="md" />
      </div>
    );
  }

  // Error state with no data
  if (error && !data) {
    return (
      <div className="text-center py-12 bg-neo-navy-light/30 rounded-neo border-neo border-black">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          {t('admin.todayGames.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-neo-lime" />
          <h2 className="text-xl font-neo-display text-neo-white">
            {t('admin.todayGames.title')}
          </h2>
        </div>
        <Button
          onClick={refresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('admin.todayGames.refresh')}
        </Button>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} total={stats.total} modeBreakdown={data?.modeBreakdown} t={t} />

      {/* Filters */}
      <GamesFilters
        languageFilter={languageFilter}
        gameTypeFilter={gameTypeFilter}
        rankedFilter={rankedFilter}
        dateRange={dateRange}
        logSource={logSource}
        onLanguageChange={setLanguageFilter}
        onGameTypeChange={setGameTypeFilter}
        onRankedChange={setRankedFilter}
        onDateRangeChange={setDateRange}
        onLogSourceChange={setLogSource}
        t={t}
      />

      {/* Unclassified modes warning */}
      {unbucketedModes.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-neo px-3 py-2 text-xs text-amber-200">
          <span className="font-semibold">{t('admin.todayGames.unclassifiedModes', 'Unclassified modes')}:</span>
          <span className="ml-2">{unbucketedModes.join(', ')}</span>
        </div>
      )}

      {/* Truncated results note */}
      {truncated && (
        <div className="bg-slate-700/30 border border-slate-600/40 rounded-neo px-3 py-2 text-xs text-slate-400">
          {t('admin.todayGames.truncated', 'Results capped — narrow the date range for details')}
        </div>
      )}

      {/* Games list (virtualized + expandable) or Empty State */}
      {filteredGameGroups && filteredGameGroups.length === 0 && !filteredGames.length ? (
        <EmptyState t={t} />
      ) : filteredGameGroups && filteredGameGroups.length > 0 ? (
        <VirtualGamesList
          gameGroups={filteredGameGroups}
          pagination={data?.pagination || null}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          t={t}
        />
      ) : (
        // Fallback for legacy 'tables' source (no grouping)
        <div className="text-center py-8 text-slate-400">
          {t('admin.todayGames.noData', 'No games found')}
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-slate-500">
        {t('admin.todayGames.lastUpdated')}:{' '}
        {new Date(lastRefresh).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default TodayGamesHistory;
