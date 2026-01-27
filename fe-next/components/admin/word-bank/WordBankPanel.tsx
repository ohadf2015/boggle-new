'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { Language } from '@/types';
import { useWordBank } from './hooks/useWordBank';
import { WordBankStatsCard } from './components/WordBankStatsCard';
import { WordBankFilters } from './components/WordBankFilters';
import { WordBankTable } from './components/WordBankTable';

export function WordBankPanel(): React.ReactElement {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'blocked' | 'used'>(
    'all'
  );
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { words, stats, loading, error, refresh, deleteWord, clearError, hasMore, loadMore } =
    useWordBank({
      language: selectedLanguage,
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      source: selectedSource === 'all' ? undefined : selectedSource,
      search: searchQuery,
    });

  const handleLanguageChange = useCallback((language: Language): void => {
    setSelectedLanguage(language);
  }, []);

  const handleStatusChange = useCallback(
    (status: 'all' | 'active' | 'blocked' | 'used'): void => {
      setSelectedStatus(status);
    },
    []
  );

  const handleSourceChange = useCallback((source: string): void => {
    setSelectedSource(source);
  }, []);

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
      <WordBankStatsCard stats={stats} loading={loading} onRefresh={refresh} />

      {/* Filters */}
      <WordBankFilters
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        selectedSource={selectedSource}
        onSourceChange={handleSourceChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Words Table */}
      <WordBankTable
        words={words}
        loading={loading}
        onDelete={deleteWord}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}
