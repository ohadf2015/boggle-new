'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, Sparkles, Edit2, Grid, List, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import {
  useScheduledWords,
  useWordManagement,
  usePlayerAttempts,
  LanguageTabs,
  DateNavigation,
  ScheduleCalendar,
  ScheduleList,
  ReplaceWordModal,
  AddWordModal,
  SetTodayModal,
  getDateRange,
  getEffectiveWord,
  getTodayDateString,
  type ViewMode,
  type ScheduledWord,
} from './daily-word';

export function DailyWordSchedule(): React.ReactElement {
  // UI State
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [daysToShow, setDaysToShow] = useState(14);
  const [dateOffset, setDateOffset] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceDate, setReplaceDate] = useState<string | null>(null);
  const [replaceWord, setReplaceWord] = useState('');
  const [resetAllOnReplace, setResetAllOnReplace] = useState(false);

  const [addWordModalOpen, setAddWordModalOpen] = useState(false);
  const [newWordDate, setNewWordDate] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  const [setTodayModalOpen, setSetTodayModalOpen] = useState(false);
  const [todayWordValue, setTodayWordValue] = useState('');
  const [resetTodayAttempts, setResetTodayAttempts] = useState(false);

  // Callbacks for hooks
  const handleSuccess = useCallback((message: string): void => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleError = useCallback((message: string): void => {
    setError(message);
  }, []);

  // Hooks
  const { scheduledWords, loading, error: fetchError, attemptSummaries, refresh } = useScheduledWords({
    language: selectedLang,
    daysToShow,
    dateOffset,
  });

  const {
    saving,
    triggerLoading,
    regeneratingBoard,
    handleSaveOverride,
    handleClearOverride,
    handleReplaceWord,
    handleAddNewWord,
    handleTriggerGeneration,
    handleRegenerateBoard,
    copyWord,
    copyResetLink,
  } = useWordManagement({
    language: selectedLang,
    onSuccess: handleSuccess,
    onError: handleError,
    onRefresh: refresh,
  });

  const {
    attempts,
    attemptsLoading,
    expandedDate,
    searchQuery,
    selectedAttempts,
    setSearchQuery,
    toggleExpanded,
    toggleAttemptSelection,
    selectAllAttempts,
    getFilteredAttempts,
    handleResetSelectedAttempts,
    saving: attemptsSaving,
  } = usePlayerAttempts({
    language: selectedLang,
    onSuccess: handleSuccess,
    onError: handleError,
  });

  // Derived data
  const allDates = getDateRange(daysToShow, dateOffset);
  const wordsByDate = new Map(scheduledWords.map((w) => [w.puzzle_date, w]));
  const todayWord = scheduledWords.find((w) => w.puzzle_date === getTodayDateString());

  // Modal handlers
  const openSetTodayModal = (): void => {
    if (todayWord) {
      setTodayWordValue(getEffectiveWord(todayWord));
    } else {
      setTodayWordValue('');
    }
    setResetTodayAttempts(false);
    setSetTodayModalOpen(true);
  };

  const handleWordClick = (dateStr: string, word: ScheduledWord | undefined): void => {
    if (word) {
      setReplaceDate(dateStr);
      setReplaceWord(getEffectiveWord(word));
      setReplaceModalOpen(true);
    } else {
      setNewWordDate(dateStr);
      setAddWordModalOpen(true);
    }
  };

  const handleOpenReplaceModal = (dateStr: string, word: ScheduledWord): void => {
    setReplaceDate(dateStr);
    setReplaceWord(getEffectiveWord(word));
    setReplaceModalOpen(true);
  };

  const handleOpenAddModal = (dateStr: string): void => {
    setNewWordDate(dateStr);
    setAddWordModalOpen(true);
  };

  const handleSubmitReplace = async (): Promise<void> => {
    if (!replaceDate) return;
    await handleReplaceWord(replaceDate, replaceWord, resetAllOnReplace);
    setReplaceModalOpen(false);
    setReplaceWord('');
    setReplaceDate(null);
    setResetAllOnReplace(false);
  };

  const handleSubmitAddWord = async (): Promise<void> => {
    await handleAddNewWord(newWordDate, newWordValue);
    setAddWordModalOpen(false);
    setNewWordValue('');
    setNewWordDate('');
  };

  const handleSubmitSetToday = async (): Promise<void> => {
    await handleReplaceWord(getTodayDateString(), todayWordValue, resetTodayAttempts);
    setSetTodayModalOpen(false);
    setTodayWordValue('');
    setResetTodayAttempts(false);
  };

  const displayError = error || fetchError;

  return (
    <div className="bg-white dark:bg-neo-navy-light rounded-neo border-3 sm:border-4 border-neo-black p-3 sm:p-6 text-neo-black dark:text-neo-cream">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-neo-pink" />
          <h2 className="text-xl sm:text-2xl font-black">Daily Word Schedule</h2>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border-2 border-neo-black rounded-neo overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-neo-pink text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-neo-pink text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              )}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={openSetTodayModal}
            size="sm"
            className={cn(
              'bg-red-500 hover:bg-red-600 text-white font-bold shadow-hard',
              !todayWord && 'animate-pulse hover:animate-none'
            )}
          >
            <Calendar className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Set Today&apos;s Word</span>
          </Button>

          <Button
            onClick={() => {
              setNewWordDate(new Date().toISOString().split('T')[0]);
              setAddWordModalOpen(true);
            }}
            variant="outline"
            size="sm"
            className="border-2 border-neo-black"
          >
            <Edit2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Other Date</span>
          </Button>

          <Button
            onClick={handleTriggerGeneration}
            disabled={triggerLoading}
            size="sm"
            className="bg-neo-pink hover:bg-neo-pink/90 text-white"
          >
            {triggerLoading ? (
              <NeoLoader variant="dots" size="sm" className="sm:mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Generate (AI)</span>
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <DateNavigation
        daysToShow={daysToShow}
        dateOffset={dateOffset}
        onDaysToShowChange={setDaysToShow}
        onDateOffsetChange={setDateOffset}
      />

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-neo flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-700 dark:text-green-300">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {displayError && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-neo flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 dark:text-red-300">{displayError}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Language Selector */}
      <LanguageTabs selectedLang={selectedLang} onLanguageChange={setSelectedLang} />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <NeoLoader variant="dots" size="md" />
        </div>
      ) : viewMode === 'grid' ? (
        <ScheduleCalendar
          dates={allDates}
          wordsByDate={wordsByDate}
          attemptSummaries={attemptSummaries}
          regeneratingBoard={regeneratingBoard}
          onWordClick={handleWordClick}
          onCopyWord={copyWord}
          onRegenerateBoard={handleRegenerateBoard}
          onViewAttempts={toggleExpanded}
        />
      ) : (
        <ScheduleList
          dates={allDates}
          wordsByDate={wordsByDate}
          attemptSummaries={attemptSummaries}
          expandedDate={expandedDate}
          attempts={attempts}
          attemptsLoading={attemptsLoading}
          searchQuery={searchQuery}
          selectedAttempts={selectedAttempts}
          saving={saving || attemptsSaving}
          regeneratingBoard={regeneratingBoard}
          onQuickSave={handleSaveOverride}
          onCopyWord={copyWord}
          onOpenReplaceModal={handleOpenReplaceModal}
          onOpenAddModal={handleOpenAddModal}
          onRegenerateBoard={handleRegenerateBoard}
          onToggleExpanded={toggleExpanded}
          onClearOverride={handleClearOverride}
          onSearchChange={setSearchQuery}
          onToggleAttemptSelection={toggleAttemptSelection}
          onSelectAllAttempts={selectAllAttempts}
          onResetSelectedAttempts={handleResetSelectedAttempts}
          onCopyResetLink={copyResetLink}
          getFilteredAttempts={getFilteredAttempts}
        />
      )}

      {/* Modals */}
      <ReplaceWordModal
        open={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        replaceDate={replaceDate}
        replaceWord={replaceWord}
        resetAllOnReplace={resetAllOnReplace}
        saving={saving}
        onReplaceWordChange={setReplaceWord}
        onResetAllChange={setResetAllOnReplace}
        onSubmit={handleSubmitReplace}
      />

      <AddWordModal
        open={addWordModalOpen}
        onClose={() => setAddWordModalOpen(false)}
        newWordDate={newWordDate}
        newWordValue={newWordValue}
        selectedLang={selectedLang}
        saving={saving}
        onDateChange={setNewWordDate}
        onWordChange={setNewWordValue}
        onSubmit={handleSubmitAddWord}
      />

      <SetTodayModal
        open={setTodayModalOpen}
        onClose={() => setSetTodayModalOpen(false)}
        todayWord={todayWord}
        todayWordValue={todayWordValue}
        resetTodayAttempts={resetTodayAttempts}
        selectedLang={selectedLang}
        saving={saving}
        onWordChange={setTodayWordValue}
        onResetChange={setResetTodayAttempts}
        onSubmit={handleSubmitSetToday}
      />
    </div>
  );
}
