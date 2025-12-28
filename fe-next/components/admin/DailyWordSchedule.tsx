'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Sparkles, Edit2, Save, X, RefreshCw, AlertCircle, Check,
  Users, Trash2, RotateCcw, Search, ChevronDown, ChevronUp
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

  const supabase = createClient();

  // Fetch scheduled words for the next 7 days
  const fetchScheduledWords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i <= 7; i++) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled words');
    } finally {
      setLoading(false);
    }
  }, [selectedLang, supabase]);

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

  // Get the effective word (override or original)
  const getEffectiveWord = (word: ScheduledWord) => {
    return word.override_word || word.target_word;
  };

  const filteredAttempts = getFilteredAttempts();

  return (
    <div className="bg-white dark:bg-neo-navy-light rounded-neo border-4 border-neo-black p-6 text-neo-black dark:text-neo-cream">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-neo-purple" />
          <h2 className="text-2xl font-black">Daily Word Schedule</h2>
        </div>
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

      {/* Scheduled Words List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-neo-purple" />
        </div>
      ) : scheduledWords.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-bold">No words scheduled</p>
          <p className="text-sm">Click &quot;Generate Words (AI)&quot; to create AI-selected words for the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledWords.map((word) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-neo border-2 transition-all overflow-hidden',
                word.override_word
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : word.ai_selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 bg-gray-50 dark:bg-gray-800'
              )}
            >
              {/* Word Row */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg">{formatDate(word.puzzle_date)}</span>
                      <span className="text-sm text-gray-500">#{word.puzzle_number}</span>
                      {word.theme_context && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                          {word.theme_context}
                        </span>
                      )}
                      {isToday(word.puzzle_date) && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full font-bold">
                          LIVE
                        </span>
                      )}
                    </div>

                    {editingId === word.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                          maxLength={4}
                          className="px-3 py-2 border-2 border-neo-black rounded-neo font-mono text-xl w-32 uppercase"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleSave(word)}
                          disabled={saving || editValue.length !== 4}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleCancel}
                          size="sm"
                          variant="outline"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-2xl font-bold">
                          {getEffectiveWord(word)}
                        </span>
                        {word.override_word && (
                          <span className="text-sm text-gray-500 line-through">
                            {word.target_word}
                          </span>
                        )}
                        {word.ai_selected && !word.override_word && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                        {word.override_word && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Edit2 className="w-3 h-3" /> Override
                          </span>
                        )}
                      </div>
                    )}

                    {word.ai_reason && !editingId && (
                      <p className="text-sm text-gray-500 mt-1 italic">
                        &quot;{word.ai_reason}&quot;
                      </p>
                    )}
                  </div>

                  {editingId !== word.id && (
                    <div className="flex items-center gap-2">
                      {/* Replace Word Button (for today) */}
                      {isToday(word.puzzle_date) && (
                        <Button
                          onClick={() => {
                            setReplaceDate(word.puzzle_date);
                            setReplaceWord(getEffectiveWord(word));
                            setReplaceModalOpen(true);
                          }}
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white"
                          title="Replace word and optionally reset attempts"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Replace
                        </Button>
                      )}

                      {/* View/Manage Attempts */}
                      <Button
                        onClick={() => toggleExpanded(word.puzzle_date)}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Users className="w-4 h-4" />
                        {expandedDate === word.puzzle_date ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        onClick={() => handleEdit(word)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {word.override_word && (
                        <Button
                          onClick={() => handleClearOverride(word)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Attempts Section */}
              <AnimatePresence>
                {expandedDate === word.puzzle_date && (
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
          ))}
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
                Replace Today&apos;s Word
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
    </div>
  );
};
