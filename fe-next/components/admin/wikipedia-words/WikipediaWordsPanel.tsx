'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Language } from '@/types';
import { getDefaultDateRange, type ValidationStatus } from './types';
import { useWikipediaCandidates } from './hooks';
import {
  WikipediaFilters,
  WikipediaCandidatesList,
  WikipediaStatsCard,
} from './components';

export function WikipediaWordsPanel(): React.ReactElement {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedStatus, setSelectedStatus] = useState<'all' | ValidationStatus>('all');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    candidates,
    stats,
    loading,
    error,
    refresh,
    updateStatus,
    deleteCandidate,
    bulkUpdateStatus,
    bulkDelete,
    triggerPopulation,
    clearError,
  } = useWikipediaCandidates({
    language: selectedLanguage,
    status: selectedStatus,
    dateRange,
    searchQuery,
  });

  const handleLanguageChange = useCallback((language: Language): void => {
    setSelectedLanguage(language);
  }, []);

  const handleStatusChange = useCallback((status: 'all' | ValidationStatus): void => {
    setSelectedStatus(status);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: { start: string; end: string }): void => {
      setDateRange(range);
    },
    []
  );

  const handleSearchChange = useCallback((query: string): void => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border-2 border-red-500 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-500 font-medium">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>
      )}

      {/* Stats Card */}
      <WikipediaStatsCard
        stats={stats}
        loading={loading}
        onRefresh={refresh}
        onTriggerPopulation={triggerPopulation}
      />

      {/* Filters */}
      <WikipediaFilters
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Candidates List */}
      <WikipediaCandidatesList
        candidates={candidates}
        loading={loading}
        onUpdateStatus={updateStatus}
        onDelete={deleteCandidate}
        onBulkUpdateStatus={bulkUpdateStatus}
        onBulkDelete={bulkDelete}
      />
    </div>
  );
}
