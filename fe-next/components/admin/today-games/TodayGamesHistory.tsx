'use client';

import React from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
import type { TodayGamesHistoryProps } from './types';

// Hooks
import { useTodayGames } from './hooks';

// Components
import { StatsBar, GamesFilters, GamesTable, EmptyState } from './components';

export function TodayGamesHistory({ authToken }: TodayGamesHistoryProps) {
  const { t, language: uiLanguage } = useLanguage();
  const isRTL = uiLanguage === 'he';

  const {
    data,
    filteredGames,
    stats,
    lastRefresh,
    loading,
    error,
    languageFilter,
    gameTypeFilter,
    rankedFilter,
    setLanguageFilter,
    setGameTypeFilter,
    setRankedFilter,
    sortField,
    sortOrder,
    handleSort,
    page,
    pageSize,
    setPage,
    refresh,
  } = useTodayGames({ authToken });

  // Initial loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <NeoLoader variant="mascot-letters" size="md" />
      </div>
    );
  }

  // Error state with no data
  if (error && !data) {
    return (
      <div className="text-center py-12 bg-slate-800/30 rounded-neo border-neo border-black">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          {t('admin.todayGames.retry') || 'Retry'}
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
            {t('admin.todayGames.title') || "Today's Games"}
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
            <NeoLoader variant="dots" size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {t('admin.todayGames.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Stats Bar */}
      <StatsBar stats={stats} t={t} />

      {/* Filters */}
      <GamesFilters
        languageFilter={languageFilter}
        gameTypeFilter={gameTypeFilter}
        rankedFilter={rankedFilter}
        onLanguageChange={setLanguageFilter}
        onGameTypeChange={setGameTypeFilter}
        onRankedChange={setRankedFilter}
        t={t}
      />

      {/* Games Table or Empty State */}
      {filteredGames.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <GamesTable
          games={filteredGames}
          pagination={data?.pagination || null}
          sortField={sortField}
          sortOrder={sortOrder}
          page={page}
          pageSize={pageSize}
          isRTL={isRTL}
          onSort={handleSort}
          onPageChange={setPage}
          t={t}
        />
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-slate-500">
        {t('admin.todayGames.lastUpdated') || 'Last updated'}:{' '}
        {new Date(lastRefresh).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default TodayGamesHistory;
