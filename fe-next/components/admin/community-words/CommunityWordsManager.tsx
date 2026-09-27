'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader } from '@/components/ui/Loader';

// Types
import type { CommunityWordsManagerProps } from './types';

// Hooks
import { useCommunityWords } from './hooks';

// Components
import { StatsCards, WordFilters, BulkActions, WordCard } from './components';

// Constants
import { createWordKey } from './constants';

export function CommunityWordsManager({ authToken }: CommunityWordsManagerProps) {
  const {
    words,
    stats,
    loading,
    processing,
    bulkProcessing,
    selectedWords,
    toggleWordSelection,
    toggleSelectAll,
    statusFilter,
    langFilter,
    searchQuery,
    setStatusFilter,
    setLangFilter,
    setSearchQuery,
    handleApprove,
    handleReject,
    handleBulkApprove,
    handleBulkReject,
  } = useCommunityWords({ authToken });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Filters and Bulk Actions */}
      <div className="space-y-4">
        <WordFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          langFilter={langFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onLangChange={setLangFilter}
        />

        <BulkActions
          totalWords={words.length}
          selectedCount={selectedWords.size}
          bulkProcessing={bulkProcessing}
          onToggleSelectAll={toggleSelectAll}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
        />
      </div>

      {/* Words List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size="md" />
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No words found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {words.map((word) => {
              const key = createWordKey(word.word, word.language);
              return (
                <WordCard
                  key={key}
                  word={word}
                  isSelected={selectedWords.has(key)}
                  isProcessing={processing === key}
                  onToggleSelect={() => toggleWordSelection(word.word, word.language)}
                  onApprove={() => handleApprove(word.word, word.language)}
                  onReject={() => handleReject(word.word, word.language)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
