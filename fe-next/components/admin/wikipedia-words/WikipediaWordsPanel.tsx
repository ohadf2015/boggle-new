'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import type { Language } from '@/types';
import { getDefaultDateRange, type ValidationStatus } from './types';
import { useWikipediaCandidates, type SyncResult } from './hooks';
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
  const [syncSuccess, setSyncSuccess] = useState<SyncResult | null>(null);

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
    bulkApproveToDict,
    triggerPopulation,
    syncFromJSON,
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

  const handleSyncFromJSON = useCallback(async (): Promise<SyncResult> => {
    setSyncSuccess(null);
    const result = await syncFromJSON();

    if (result.success && result.syncDate) {
      // Update date range to include today so synced words are visible
      const today = result.syncDate;
      setDateRange(prev => {
        if (prev.end < today) {
          return { ...prev, end: today };
        }
        return prev;
      });

      setSyncSuccess(result);

      // Auto-clear success message after 5 seconds
      setTimeout(() => setSyncSuccess(null), 5000);
    }

    return result;
  }, [syncFromJSON]);

  const clearSyncSuccess = useCallback((): void => {
    setSyncSuccess(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      {syncSuccess && (
        <div className="flex items-center justify-between p-4 bg-green-500/10 border-2 border-green-500 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">
              Sync completed: {syncSuccess.wordCount ?? 0} words synced
              {syncSuccess.languageBreakdown && Object.keys(syncSuccess.languageBreakdown).length > 1 && (
                <span className="text-green-400 text-sm ms-2">
                  ({Object.entries(syncSuccess.languageBreakdown)
                    .map(([lang, count]) => `${lang}: ${count}`)
                    .join(', ')})
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSyncSuccess}
            className="p-1 hover:bg-green-500/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-green-500" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border-2 border-red-500 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-500 font-medium">{error}</span>
          </div>
          <button
            type="button"
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
        onSyncFromJSON={handleSyncFromJSON}
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
        onBulkApproveToDict={bulkApproveToDict}
      />
    </div>
  );
}
