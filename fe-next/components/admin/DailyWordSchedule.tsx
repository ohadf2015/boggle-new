'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Sparkles, Edit2, Save, X, RefreshCw, AlertCircle, Check,
  Users, Trash2, RotateCcw, Search, ChevronDown, ChevronUp, Eye, Grid, List,
  ChevronLeft, ChevronRight, Copy, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import type { Language } from '@/types';

interface ScheduledWord {
  id: string;
  puzzle_date: string;
  language: string;
  puzzle_number: number;
  target_word: string;
  ai_selected: boolean;
  ai_reason: string | null;
  theme_context: string | null;
  override_word: string | null;
  override_by: string | null;
  override_at: string | null;
  created_at: string;
}

interface PlayerAttempt {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_emoji: string | null;
  avatar_color: string | null;
  solved: boolean;
  attempts_used: number;
  target_word: string;
  efficiency_score: number;
  completed_at: string;
}

interface AttemptSummary {
  total: number;
  solved: number;
  failed: number;
}

type ViewMode = 'list' | 'grid';

const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

export const DailyWordSchedule: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<Language>('en');
  const [scheduledWords, setScheduledWords] = useState<ScheduledWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state for player attempts management
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<PlayerAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttempts, setSelectedAttempts] = useState<Set<string>>(new Set());
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [replaceDate, setReplaceDate] = useState<string | null>(null);
  const [replaceWord, setReplaceWord] = useState('');
  const [resetAllOnReplace, setResetAllOnReplace] = useState(false);

  // State for adding new word
  const [addWordModalOpen, setAddWordModalOpen] = useState(false);
  const [newWordDate, setNewWordDate] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  // New state for enhanced UI
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [daysToShow, setDaysToShow] = useState(14);
  const [dateOffset, setDateOffset] = useState(0);
  const [attemptSummaries, setAttemptSummaries] = useState<Record<string, AttemptSummary>>({});
  const [quickEditWord, setQuickEditWord] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState('');

  const supabase = createClient();

  // Fetch scheduled words for the configured date range
  const fetchScheduledWords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const dates: string[] = [];
      // Start from dateOffset days ago (for viewing past words) or from today
      const startOffset = Math.min(dateOffset, 0);
      for (let i = startOffset; i < daysToShow + startOffset; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const { data, error: fetchError } = await supabase
        .from('daily_target_words')
        .select('*')
        .eq('language', selectedLang)
        .in('puzzle_date', dates)
        .order('puzzle_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setScheduledWords(data || []);

      // Fetch attempt summaries for all dates
      fetchAttemptSummaries(dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled words');
    } finally {
      setLoading(false);
    }
  }, [selectedLang, supabase, daysToShow, dateOffset]);

  // Fetch attempt summaries for multiple dates
  const fetchAttemptSummaries = async (dates: string[]) => {
    try {
      const { data, error } = await supabase
        .from('daily_word_hunt_attempts')
        .select('puzzle_date, solved')
        .eq('language', selectedLang)
        .in('puzzle_date', dates);

      if (error) throw error;

      const summaries: Record<string, AttemptSummary> = {};
      dates.forEach(date => {
        summaries[date] = { total: 0, solved: 0, failed: 0 };
      });

      (data || []).forEach((attempt: { puzzle_date: string; solved: boolean }) => {
        if (summaries[attempt.puzzle_date]) {
          summaries[attempt.puzzle_date].total++;
          if (attempt.solved) {
            summaries[attempt.puzzle_date].solved++;
          } else {
            summaries[attempt.puzzle_date].failed++;
          }
        }
      });

      setAttemptSummaries(summaries);
    } catch (err) {
      console.error('Failed to fetch attempt summaries:', err);
    }
  };

  useEffect(() => {
    fetchScheduledWords();
  }, [fetchScheduledWords]);

  // Fetch attempts for a specific date
  const fetchAttempts = async (puzzleDate: string) => {
    setAttemptsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/daily-word/attempts?puzzleDate=${puzzleDate}&language=${selectedLang}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch attempts');
      }
      const data = await response.json();
      setAttempts(data.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attempts');
    } finally {
      setAttemptsLoading(false);
    }
  };

  // Toggle expanded date to show/hide attempts
  const toggleExpanded = (dateString: string) => {
    if (expandedDate === dateString) {
      setExpandedDate(null);
      setAttempts([]);
      setSelectedAttempts(new Set());
    } else {
      setExpandedDate(dateString);
      fetchAttempts(dateString);
      setSelectedAttempts(new Set());
    }
  };

  // Start editing a word
  const handleEdit = (word: ScheduledWord) => {
    setEditingId(word.id);
    setEditValue(word.override_word || word.target_word);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save override
  const handleSave = async (word: ScheduledWord) => {
    if (!editValue.trim()) {
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('daily_target_words')
        .update({
          override_word: editValue.toUpperCase().trim(),
          override_at: new Date().toISOString(),
        })
        .eq('id', word.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh the list
      await fetchScheduledWords();
      setEditingId(null);
      setEditValue('');
      setSuccessMessage('Word override saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setSaving(false);
    }
  };

  // Clear override
  const handleClearOverride = async (word: ScheduledWord) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('daily_target_words')
        .update({
          override_word: null,
          override_by: null,
          override_at: null,
        })
        .eq('id', word.id);

      if (updateError) {
        throw updateError;
      }

      await fetchScheduledWords();
      setSuccessMessage('Override cleared successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear override');
    } finally {
      setSaving(false);
    }
  };

  // Trigger the Edge Function manually
  const handleTriggerGeneration = async () => {
    setTriggerLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/trigger-daily-word-generation', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to trigger generation');
      }

      const result = await response.json();
      setSuccessMessage(`Generated ${result.summary?.created || 0} new words!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh the list
      await fetchScheduledWords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger generation');
    } finally {
      setTriggerLoading(false);
    }
  };

  // Add a new word for a specific date
  const handleAddNewWord = async () => {
    if (!newWordDate || !newWordValue.trim() || newWordValue.length !== 4) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/daily-word/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          puzzleDate: newWordDate,
          language: selectedLang,
          newWord: newWordValue.toUpperCase().trim(),
          resetAllAttempts: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add word');
      }

      setSuccessMessage(`Word "${newWordValue.toUpperCase()}" added for ${formatDate(newWordDate)}`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh data
      await fetchScheduledWords();

      // Close modal
      setAddWordModalOpen(false);
      setNewWordValue('');
      setNewWordDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add word');
    } finally {
      setSaving(false);
    }
  };

  // Replace word and optionally reset all attempts
  const handleReplaceWord = async () => {
    if (!replaceDate || !replaceWord.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/daily-word/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          puzzleDate: replaceDate,
          language: selectedLang,
          newWord: replaceWord.toUpperCase().trim(),
          resetAllAttempts: resetAllOnReplace,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to replace word');
      }

      const result = await response.json();
      let message = `Word replaced with "${replaceWord.toUpperCase()}"`;
      if (result.reset?.deleted) {
        message += ` and ${result.reset.deleted} attempts reset`;
      }
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh data
      await fetchScheduledWords();
      if (expandedDate === replaceDate) {
        await fetchAttempts(replaceDate);
      }

      // Close modal
      setReplaceModalOpen(false);
      setReplaceWord('');
      setReplaceDate(null);
      setResetAllOnReplace(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace word');
    } finally {
      setSaving(false);
    }
  };

  // Reset selected player attempts
  const handleResetSelectedAttempts = async () => {
    if (selectedAttempts.size === 0 || !expandedDate) return;

    const selectedList = attempts.filter(a => selectedAttempts.has(a.id));
    const playerIds = selectedList.filter(a => a.player_id).map(a => a.player_id);
    const guestFingerprints = selectedList.filter(a => a.guest_fingerprint).map(a => a.guest_fingerprint);

    setSaving(true);
    try {
      const response = await fetch('/api/admin/daily-word/reset-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          puzzleDate: expandedDate,
          language: selectedLang,
          playerIds,
          guestFingerprints,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset attempts');
      }

      const result = await response.json();
      setSuccessMessage(`Reset ${result.deleted} player attempts`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh attempts
      await fetchAttempts(expandedDate);
      setSelectedAttempts(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset attempts');
    } finally {
      setSaving(false);
    }
  };

  // Toggle attempt selection
  const toggleAttemptSelection = (id: string) => {
    const newSelected = new Set(selectedAttempts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAttempts(newSelected);
  };

  // Select all visible attempts
  const selectAllAttempts = () => {
    const filtered = getFilteredAttempts();
    if (selectedAttempts.size === filtered.length) {
      setSelectedAttempts(new Set());
    } else {
      setSelectedAttempts(new Set(filtered.map(a => a.id)));
    }
  };

  // Filter attempts by search
  const getFilteredAttempts = () => {
    if (!searchQuery) return attempts;
    const query = searchQuery.toLowerCase();
    return attempts.filter(a =>
      a.display_name?.toLowerCase().includes(query)
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if date is today
  const isToday = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  // Check if date is in the past
  const isPast = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  };

  // Get the effective word (override or original)
  const getEffectiveWord = (word: ScheduledWord) => {
    return word.override_word || word.target_word;
  };

  // Copy word to clipboard
  const copyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      setSuccessMessage(`Copied "${word}" to clipboard`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  // Quick save for inline editing
  const handleQuickSave = async (word: ScheduledWord) => {
    if (!quickEditValue.trim() || quickEditValue.length !== 4) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('daily_target_words')
        .update({
          override_word: quickEditValue.toUpperCase().trim(),
          override_at: new Date().toISOString(),
        })
        .eq('id', word.id);

      if (updateError) throw updateError;

      await fetchScheduledWords();
      setQuickEditWord(null);
      setQuickEditValue('');
      setSuccessMessage(`Word updated to "${quickEditValue.toUpperCase()}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Get date range info for display
  const getDateRangeInfo = () => {
    const today = new Date();
    const startOffset = Math.min(dateOffset, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + startOffset);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysToShow + startOffset - 1);
    return {
      start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  // Get status for a date (missing, live, scheduled, past)
  const getDateStatus = (dateString: string, hasWord: boolean) => {
    if (isToday(dateString)) return 'live';
    if (isPast(dateString)) return 'past';
    if (!hasWord) return 'missing';
    return 'scheduled';
  };

  // Get all dates in the current range for grid view
  const getAllDatesInRange = () => {
    const today = new Date();
    const dates: string[] = [];
    const startOffset = Math.min(dateOffset, 0);
    for (let i = startOffset; i < daysToShow + startOffset; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const filteredAttempts = getFilteredAttempts();

  const dateRange = getDateRangeInfo();
  const allDates = getAllDatesInRange();
  const wordsByDate = new Map(scheduledWords.map(w => [w.puzzle_date, w]));

  return (
    <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-6 text-neo-black dark:text-neo-cream">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-neo-purple" />
          <h2 className="text-2xl font-black">Daily Word Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border-2 border-neo-black rounded-neo overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-neo-purple text-white'
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
                  ? 'bg-neo-purple text-white'
                  : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              )}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setNewWordDate(today);
              setAddWordModalOpen(true);
            }}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Add Word
          </Button>
          <Button
            onClick={handleTriggerGeneration}
            disabled={triggerLoading}
            className="bg-neo-purple hover:bg-neo-purple/90 text-white"
          >
            {triggerLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Words (AI)
          </Button>
        </div>
      </div>

      {/* Date Range Navigation */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-neo border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateOffset(prev => prev - 7)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">
            {dateRange.start} - {dateRange.end}
          </span>
          <button
            onClick={() => setDateOffset(prev => Math.min(prev + 7, 0))}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Next week"
            disabled={dateOffset >= 0}
          >
            <ChevronRight className={cn("w-5 h-5", dateOffset >= 0 && "opacity-30")} />
          </button>
          {dateOffset !== 0 && (
            <button
              onClick={() => setDateOffset(0)}
              className="ml-2 text-xs text-neo-purple hover:underline font-bold"
            >
              Back to Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Show:</span>
          <select
            value={daysToShow}
            onChange={(e) => setDaysToShow(Number(e.target.value))}
            className="text-sm border-2 border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>

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
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-neo flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Language Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={cn(
              'px-4 py-2 rounded-neo border-2 border-neo-black font-bold transition-all',
              selectedLang === lang.code
                ? 'bg-neo-purple text-white shadow-hard'
                : 'bg-white dark:bg-gray-700 hover:shadow-hard'
            )}
          >
            {lang.flag} {lang.name}
          </button>
        ))}
      </div>

      {/* Scheduled Words - Grid View */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-neo-purple" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {allDates.map((dateStr) => {
            const word = wordsByDate.get(dateStr);
            const status = getDateStatus(dateStr, !!word);
            const summary = attemptSummaries[dateStr];

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'rounded-neo border-3 p-3 cursor-pointer transition-all hover:shadow-hard group relative',
                  status === 'live' && 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-400',
                  status === 'past' && 'border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-60',
                  status === 'missing' && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 border-dashed',
                  status === 'scheduled' && word?.override_word && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
                  status === 'scheduled' && !word?.override_word && 'border-green-500 bg-green-50 dark:bg-green-900/20'
                )}
                onClick={() => {
                  if (word) {
                    setReplaceDate(dateStr);
                    setReplaceWord(getEffectiveWord(word));
                    setReplaceModalOpen(true);
                  } else {
                    setNewWordDate(dateStr);
                    setAddWordModalOpen(true);
                  }
                }}
              >
                {/* Status Badge */}
                {status === 'live' && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold animate-pulse">
                    LIVE
                  </span>
                )}
                {status === 'missing' && (
                  <span className="absolute -top-2 -right-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </span>
                )}

                {/* Date */}
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  {formatDate(dateStr)}
                </div>

                {/* Word Display */}
                {word ? (
                  <div className="text-center">
                    <div className={cn(
                      "font-mono text-xl font-black tracking-wider",
                      status === 'live' && 'text-red-600 dark:text-red-400',
                      status === 'past' && 'text-gray-500',
                      status === 'scheduled' && 'text-neo-black dark:text-neo-cream'
                    )}>
                      {getEffectiveWord(word)}
                    </div>
                    {word.override_word && (
                      <div className="text-xs text-amber-600 flex items-center justify-center gap-1 mt-1">
                        <Edit2 className="w-3 h-3" /> edited
                      </div>
                    )}
                    {word.ai_selected && !word.override_word && (
                      <div className="text-xs text-green-600 flex items-center justify-center gap-1 mt-1">
                        <Sparkles className="w-3 h-3" /> AI
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <div className="font-mono text-xl">----</div>
                    <div className="text-xs mt-1">Click to add</div>
                  </div>
                )}

                {/* Attempt Summary */}
                {summary && summary.total > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {summary.total}
                      </span>
                      <span className="text-green-600">{summary.solved}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-red-500">{summary.failed}</span>
                    </div>
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-neo flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (word) {
                        copyWord(getEffectiveWord(word));
                      }
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="Copy word"
                  >
                    <Copy className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (word) {
                        toggleExpanded(dateStr);
                      }
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                    title="View attempts"
                  >
                    <Eye className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {allDates.map((dateStr) => {
            const word = wordsByDate.get(dateStr);
            const status = getDateStatus(dateStr, !!word);
            const summary = attemptSummaries[dateStr];

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-neo border-2 transition-all overflow-hidden',
                  status === 'live' && 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-400',
                  status === 'past' && 'border-gray-300 bg-gray-100 dark:bg-gray-800',
                  status === 'missing' && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 border-dashed',
                  status === 'scheduled' && word?.override_word && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
                  status === 'scheduled' && !word?.override_word && 'border-green-500 bg-green-50 dark:bg-green-900/20'
                )}
              >
                {/* Word Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Date and Word */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Date Section */}
                      <div className="flex-shrink-0 w-24">
                        <div className="font-bold text-lg">{formatDate(dateStr)}</div>
                        {word && (
                          <div className="text-xs text-gray-500">#{word.puzzle_number}</div>
                        )}
                      </div>

                      {/* Word Section - Now more prominent */}
                      {word ? (
                        quickEditWord === word.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={quickEditValue}
                              onChange={(e) => setQuickEditValue(e.target.value.toUpperCase())}
                              maxLength={4}
                              className="px-3 py-2 border-3 border-neo-black rounded-neo font-mono text-2xl w-28 uppercase text-center"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && quickEditValue.length === 4) {
                                  handleQuickSave(word);
                                } else if (e.key === 'Escape') {
                                  setQuickEditWord(null);
                                  setQuickEditValue('');
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleQuickSave(word)}
                              disabled={saving || quickEditValue.length !== 4}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => {
                                setQuickEditWord(null);
                                setQuickEditValue('');
                              }}
                              size="sm"
                              variant="outline"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => {
                              setQuickEditWord(word.id);
                              setQuickEditValue(getEffectiveWord(word));
                            }}
                            title="Click to edit"
                          >
                            <span className={cn(
                              "font-mono text-3xl font-black tracking-wider px-4 py-2 rounded-neo border-2 border-transparent group-hover:border-neo-black group-hover:bg-white dark:group-hover:bg-gray-700 transition-all",
                              status === 'live' && 'text-red-600 dark:text-red-400',
                              status === 'past' && 'text-gray-500'
                            )}>
                              {getEffectiveWord(word)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyWord(getEffectiveWord(word));
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              title="Copy word"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={() => {
                            setNewWordDate(dateStr);
                            setAddWordModalOpen(true);
                          }}
                          className="font-mono text-2xl text-gray-400 hover:text-neo-purple transition-colors flex items-center gap-2"
                        >
                          <span className="px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-neo">
                            ----
                          </span>
                          <span className="text-sm font-sans">+ Add word</span>
                        </button>
                      )}

                      {/* Tags */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {status === 'live' && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold animate-pulse">
                            LIVE NOW
                          </span>
                        )}
                        {word?.override_word && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                            <Edit2 className="w-3 h-3" /> Override
                          </span>
                        )}
                        {word?.ai_selected && !word.override_word && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                        {word?.theme_context && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                            {word.theme_context}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Stats and Actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Attempt Summary - Always visible */}
                      {summary && (
                        <div className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-neo border-2",
                          summary.total > 0
                            ? "border-gray-300 bg-white dark:bg-gray-700"
                            : "border-gray-200 bg-gray-50 dark:bg-gray-800"
                        )}>
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="font-bold">{summary.total}</span>
                          </div>
                          {summary.total > 0 && (
                            <>
                              <div className="w-px h-4 bg-gray-300" />
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-green-600 font-bold">{summary.solved}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-red-500 font-bold">{summary.failed}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {word && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              setReplaceDate(dateStr);
                              setReplaceWord(getEffectiveWord(word));
                              setReplaceModalOpen(true);
                            }}
                            size="sm"
                            className={cn(
                              "text-white",
                              status === 'live'
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-amber-500 hover:bg-amber-600"
                            )}
                            title="Replace word and optionally reset attempts"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Replace
                          </Button>

                          <Button
                            onClick={() => toggleExpanded(dateStr)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Users className="w-4 h-4" />
                            {expandedDate === dateStr ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>

                          {word.override_word && (
                            <Button
                              onClick={() => handleClearOverride(word)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              title="Clear override"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Reason - Collapsed by default */}
                  {word?.ai_reason && (
                    <p className="text-sm text-gray-500 mt-2 ml-28 italic">
                      &quot;{word.ai_reason}&quot;
                    </p>
                  )}
                </div>

                {/* Expanded Attempts Section */}
                <AnimatePresence>
                  {expandedDate === dateStr && word && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50"
                    >
                      <div className="p-4">
                        {/* Search and Actions */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search players..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-neo text-sm"
                            />
                          </div>

                          {selectedAttempts.size > 0 && (
                            <Button
                              onClick={handleResetSelectedAttempts}
                              disabled={saving}
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Reset {selectedAttempts.size} Selected
                            </Button>
                          )}
                        </div>

                      {/* Attempts List */}
                      {attemptsLoading ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-neo-purple" />
                        </div>
                      ) : filteredAttempts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No attempts found</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="py-2 px-2 text-left">
                                  <input
                                    type="checkbox"
                                    checked={selectedAttempts.size === filteredAttempts.length && filteredAttempts.length > 0}
                                    onChange={selectAllAttempts}
                                    className="rounded"
                                  />
                                </th>
                                <th className="py-2 px-2 text-left">Player</th>
                                <th className="py-2 px-2 text-center">Solved</th>
                                <th className="py-2 px-2 text-center">Attempts</th>
                                <th className="py-2 px-2 text-center">Score</th>
                                <th className="py-2 px-2 text-left">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAttempts.map((attempt) => (
                                <tr
                                  key={attempt.id}
                                  className={cn(
                                    'border-b border-gray-100 dark:border-gray-800',
                                    selectedAttempts.has(attempt.id) && 'bg-blue-50 dark:bg-blue-900/20'
                                  )}
                                >
                                  <td className="py-2 px-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedAttempts.has(attempt.id)}
                                      onChange={() => toggleAttemptSelection(attempt.id)}
                                      className="rounded"
                                    />
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                        style={{ backgroundColor: attempt.avatar_color || '#6366f1' }}
                                      >
                                        {attempt.avatar_emoji || '🎯'}
                                      </span>
                                      <span className="font-medium truncate max-w-[150px]">
                                        {attempt.display_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    {attempt.solved ? (
                                      <span className="text-green-600">Yes</span>
                                    ) : (
                                      <span className="text-red-500">No</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono">
                                    {attempt.attempts_used}/10
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono">
                                    {attempt.efficiency_score}
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className={cn(
                                      'px-2 py-0.5 rounded text-xs',
                                      attempt.player_id
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                                    )}>
                                      {attempt.player_id ? 'User' : 'Guest'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Replace Word Modal */}
      <AnimatePresence>
        {replaceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setReplaceModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-neo border-4 border-neo-black p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-500" />
                Replace Word for {replaceDate ? formatDate(replaceDate) : 'Selected Date'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">New Word (4 letters)</label>
                  <input
                    type="text"
                    value={replaceWord}
                    onChange={(e) => setReplaceWord(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-full px-4 py-3 border-2 border-neo-black rounded-neo font-mono text-2xl uppercase text-center"
                    placeholder="WORD"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-neo border-2 border-red-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetAllOnReplace}
                    onChange={(e) => setResetAllOnReplace(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className="font-bold text-red-700 dark:text-red-300">Reset all attempts</p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Delete all player attempts so they can replay with the new word
                    </p>
                  </div>
                </label>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setReplaceModalOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReplaceWord}
                    disabled={saving || replaceWord.length !== 4}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Replace Word
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add New Word Modal */}
      <AnimatePresence>
        {addWordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setAddWordModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-neo border-4 border-neo-black p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-green-500" />
                Add Word of the Day
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={newWordDate}
                    onChange={(e) => setNewWordDate(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-neo-black rounded-neo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Word (4 letters)</label>
                  <input
                    type="text"
                    value={newWordValue}
                    onChange={(e) => setNewWordValue(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-full px-4 py-3 border-2 border-neo-black rounded-neo font-mono text-2xl uppercase text-center"
                    placeholder="WORD"
                  />
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-neo border-2 border-blue-300">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Language:</strong> {LANGUAGES.find(l => l.code === selectedLang)?.flag} {LANGUAGES.find(l => l.code === selectedLang)?.name}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    This will set the word for the selected language. Change the language selector above to add words for other languages.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setAddWordModalOpen(false);
                      setNewWordValue('');
                      setNewWordDate('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddNewWord}
                    disabled={saving || newWordValue.length !== 4 || !newWordDate}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Add Word
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
