'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Language } from '@/types';
import { createClient } from '@/utils/supabase/client';

// Hooks
import { useDailyWordLists, useWordSchedule, useBulkGeneration } from './hooks';

// Components
import {
  LanguageSelector,
  ScheduleManager,
  BulkGenerator,
  WordListStats,
  WordListEditor,
} from './components';

export const DailyWordManager: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Fetch access token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    };
    fetchToken();
  }, []);

  // Custom hooks for state management
  const {
    wordLists,
    currentWords,
    filteredWords,
    stats,
    searchQuery,
    setSearchQuery,
    addWord,
    removeWord,
    resetToDefaults,
  } = useDailyWordLists(selectedLang);

  const {
    schedule,
    isLoading: loadingSchedule,
    editingDate,
    editWordValue,
    fetchSchedule,
    startEdit,
    cancelEdit,
    setEditWordValue,
    saveSingleWord,
  } = useWordSchedule(selectedLang, accessToken);

  const {
    bulkState,
    bulkStartDate,
    bulkEndDate,
    isSaving,
    showBulkGenerator,
    setBulkStartDate,
    setBulkEndDate,
    setShowBulkGenerator,
    generateWords,
    updateWord,
    saveWords,
  } = useBulkGeneration(selectedLang, currentWords, accessToken);

  // Handlers
  const handleAddWord = useCallback(
    (word: string) => addWord(word, selectedLang),
    [addWord, selectedLang]
  );

  const handleRemoveWord = useCallback(
    (word: string) => removeWord(word, selectedLang),
    [removeWord, selectedLang]
  );

  const handleSaveSingleWord = useCallback(
    async (date: string) => {
      setIsSavingSchedule(true);
      const success = await saveSingleWord(date);
      setIsSavingSchedule(false);
      if (!success) {
        alert('Error updating word');
      }
    },
    [saveSingleWord]
  );

  const handleBulkSave = useCallback(async () => {
    const result = await saveWords();
    if (result.message) {
      alert(result.message);
    }
    if (result.success) {
      // Refresh schedule after saving
      await fetchSchedule();
    }
  }, [saveWords, fetchSchedule]);

  // Create word counts object for language selector
  const wordCounts = Object.fromEntries(
    Object.entries(wordLists).map(([lang, words]) => [lang, words.length])
  ) as Record<Language, number>;

  return (
    <div className="w-full">
      <div className="max-w-6xl mx-auto">
        {/* Language Selector */}
        <LanguageSelector
          selectedLang={selectedLang}
          onSelectLang={setSelectedLang}
          wordCounts={wordCounts}
        />

        {/* Schedule Manager */}
        <ScheduleManager
          schedule={schedule}
          isLoading={loadingSchedule}
          editingDate={editingDate}
          editWordValue={editWordValue}
          isSaving={isSavingSchedule}
          onRefresh={fetchSchedule}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onEditWordChange={setEditWordValue}
          onSaveWord={handleSaveSingleWord}
        />

        {/* AI Bulk Generator */}
        <BulkGenerator
          selectedLang={selectedLang}
          bulkState={bulkState}
          bulkStartDate={bulkStartDate}
          bulkEndDate={bulkEndDate}
          isSaving={isSaving}
          showBulkGenerator={showBulkGenerator}
          onToggleShow={() => setShowBulkGenerator(!showBulkGenerator)}
          onStartDateChange={setBulkStartDate}
          onEndDateChange={setBulkEndDate}
          onGenerate={generateWords}
          onWordChange={updateWord}
          onSave={handleBulkSave}
        />

        {/* Main Grid: Stats + Word List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats Panel */}
          <WordListStats
            stats={stats}
            wordLists={wordLists}
            onResetToDefaults={resetToDefaults}
          />

          {/* Word List Editor */}
          <WordListEditor
            filteredWords={filteredWords}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddWord={handleAddWord}
            onRemoveWord={handleRemoveWord}
          />
        </div>
      </div>
    </div>
  );
};
