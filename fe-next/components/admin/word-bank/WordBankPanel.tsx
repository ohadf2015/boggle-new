'use client';

import React, { useState, useCallback } from 'react';
import { AlertCircle, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';
import type { ValidationStatus } from './types';
import { useWordBank } from './hooks/useWordBank';
import { WordBankStatsCard } from './components/WordBankStatsCard';
import { WordBankFilters } from './components/WordBankFilters';
import { WordBankTable } from './components/WordBankTable';
import { BulkImportModal } from './components/BulkImportModal';
import { BulkActionsBar } from './components/BulkActionsBar';

export function WordBankPanel(): React.ReactElement {
  const { t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'blocked' | 'used'>(
    'all'
  );
  const [selectedValidationStatus, setSelectedValidationStatus] = useState<'all' | ValidationStatus>(
    'all'
  );
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);

  const {
    words,
    stats,
    loading,
    error,
    refresh,
    deleteWord,
    approveWord,
    rejectWord,
    bulkApprove,
    bulkReject,
    clearError,
    hasMore,
    loadMore,
  } = useWordBank({
    language: selectedLanguage,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
    validation_status: selectedValidationStatus === 'all' ? undefined : selectedValidationStatus,
    source: selectedSource === 'all' ? undefined : selectedSource,
    search: searchQuery,
  });

  const handleLanguageChange = useCallback((language: Language): void => {
    setSelectedLanguage(language);
    setSelectedWords(new Set()); // Clear selection on language change
  }, []);

  const handleStatusChange = useCallback(
    (status: 'all' | 'active' | 'blocked' | 'used'): void => {
      setSelectedStatus(status);
    },
    []
  );

  const handleValidationStatusChange = useCallback(
    (status: 'all' | ValidationStatus): void => {
      setSelectedValidationStatus(status);
    },
    []
  );

  const handleSourceChange = useCallback((source: string): void => {
    setSelectedSource(source);
  }, []);

  const handleSearchChange = useCallback((query: string): void => {
    setSearchQuery(query);
  }, []);

  const handleToggleSelect = useCallback((wordId: string): void => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((): void => {
    setSelectedWords(prev => {
      const allSelected = words.every(w => prev.has(w.id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(words.map(w => w.id));
      }
    });
  }, [words]);

  const handleClearSelection = useCallback((): void => {
    setSelectedWords(new Set());
  }, []);

  const handleBulkApprove = useCallback(async () => {
    const wordIds = Array.from(selectedWords);
    return bulkApprove(wordIds);
  }, [selectedWords, bulkApprove]);

  const handleBulkReject = useCallback(async () => {
    const wordIds = Array.from(selectedWords);
    return bulkReject(wordIds);
  }, [selectedWords, bulkReject]);

  const handleImportComplete = useCallback((): void => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-6 relative pb-20">
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

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{t('admin.wordBank.wordList')}</h3>
        <Button onClick={() => setShowImportModal(true)} className="gap-2 bg-neo-yellow text-black hover:bg-neo-yellow/90">
          <Upload className="w-4 h-4" />
          {t('admin.wordBank.bulkImport.button')}
        </Button>
      </div>

      {/* Filters */}
      <WordBankFilters
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        selectedValidationStatus={selectedValidationStatus}
        onValidationStatusChange={handleValidationStatusChange}
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
        onApprove={approveWord}
        onReject={rejectWord}
        selectedWords={selectedWords}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedWords.size}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        onClearSelection={handleClearSelection}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        language={selectedLanguage}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
