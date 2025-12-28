'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, Edit2, Save, X, RefreshCw, AlertCircle, Check } from 'lucide-react';
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

  // Get the effective word (override or original)
  const getEffectiveWord = (word: ScheduledWord) => {
    return word.override_word || word.target_word;
  };

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
          Generate Words
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
          <p className="text-sm">Click "Generate Words" to create AI-selected words for the next 7 days</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduledWords.map((word) => (
            <motion.div
              key={word.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'p-4 rounded-neo border-2 transition-all',
                word.override_word
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : word.ai_selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 bg-gray-50 dark:bg-gray-800'
              )}
            >
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
                  </div>

                  {editingId === word.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                        className="px-3 py-2 border-2 border-neo-black rounded-neo font-mono text-xl w-40"
                        autoFocus
                      />
                      <Button
                        onClick={() => handleSave(word)}
                        disabled={saving}
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
                      "{word.ai_reason}"
                    </p>
                  )}
                </div>

                {editingId !== word.id && (
                  <div className="flex items-center gap-2">
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
