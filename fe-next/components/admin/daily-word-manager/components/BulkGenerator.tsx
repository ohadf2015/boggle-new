'use client';

import React from 'react';
import { Sparkles, Calendar, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import type { BulkGenerateState } from '../types';
import { formatDateDisplay } from '../constants';

interface BulkGeneratorProps {
  selectedLang: Language;
  bulkState: BulkGenerateState;
  bulkStartDate: string;
  bulkEndDate: string;
  isSaving: boolean;
  showBulkGenerator: boolean;
  onToggleShow: () => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onGenerate: () => void;
  onWordChange: (index: number, newWord: string) => void;
  onSave: () => void;
}

export const BulkGenerator: React.FC<BulkGeneratorProps> = ({
  selectedLang,
  bulkState,
  bulkStartDate,
  bulkEndDate,
  isSaving,
  showBulkGenerator,
  onToggleShow,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  onWordChange,
  onSave,
}) => {
  return (
    <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
      <button onClick={onToggleShow} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="font-bold text-base sm:text-lg">AI Bulk Word Generator</span>
        </div>
        <span className="text-sm text-gray-500">{showBulkGenerator ? '▼' : '▶'}</span>
      </button>

      {showBulkGenerator && (
        <div className="mt-4 space-y-4">
          {/* Date Range Selection */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4 inline me-1" />
                Start Date
              </label>
              <input
                type="date"
                value={bulkStartDate}
                onChange={e => onStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-neo-navy-elevated text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4 inline me-1" />
                End Date
              </label>
              <input
                type="date"
                value={bulkEndDate}
                onChange={e => onEndDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-neo-navy-elevated text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={onGenerate}
                disabled={bulkState.isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white min-h-[42px]"
              >
                {bulkState.isLoading ? (
                  <>
                    <span className="me-2">
                      <Loader size="sm" />
                    </span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 me-2" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {bulkState.error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 inline me-2" />
              {bulkState.error}
            </div>
          )}

          {/* AI Not Configured Warning */}
          {!bulkState.aiConfigured && bulkState.stats && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 inline me-2" />
              <strong>AI not configured:</strong> GEMINI_API_KEY environment variable is not set.
              Words must be entered manually.
            </div>
          )}

          {/* Stats Display */}
          {bulkState.stats && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              <div className="flex flex-wrap gap-4 text-blue-800 dark:text-blue-300">
                <span>
                  Total dates: <strong>{bulkState.stats.totalDates}</strong>
                </span>
                <span>
                  Already scheduled: <strong>{bulkState.stats.existingDates}</strong>
                </span>
                <span>
                  To generate: <strong>{bulkState.stats.generatedDates}</strong>
                </span>
                <span>
                  Excluded words (30-day): <strong>{bulkState.stats.excludedWordsCount}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Existing Words Display */}
          {bulkState.existingWords.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 text-gray-600 dark:text-gray-400">
                Already Scheduled:
              </h4>
              <div className="flex flex-wrap gap-2">
                {bulkState.existingWords.map(item => (
                  <span
                    key={item.date}
                    className="px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs font-mono"
                  >
                    {formatDateDisplay(item.date)}: <strong>{item.word}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Generated Words Editor */}
          {bulkState.generatedWords.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
                AI Generated Words (edit before saving):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {bulkState.generatedWords.map((item, index) => (
                  <div
                    key={item.date}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded-lg border border-gray-200 dark:border-slate-600"
                  >
                    <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 w-20">
                      {formatDateDisplay(item.date)}
                    </div>
                    <input
                      type="text"
                      value={item.word}
                      onChange={e => onWordChange(index, e.target.value)}
                      placeholder="Enter word"
                      className={cn(
                        'flex-1 px-2 py-1 border rounded font-mono text-sm uppercase min-w-0',
                        'bg-white dark:bg-slate-600 border-gray-300 dark:border-slate-500',
                        !item.word && 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      )}
                      maxLength={selectedLang === 'ja' ? 4 : 8}
                    />
                    {item.reason && (
                      <span
                        className="shrink-0 text-xs text-gray-400 truncate max-w-[80px]"
                        title={item.reason}
                      >
                        {item.reason.length > 15 ? item.reason.slice(0, 15) + '...' : item.reason}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Save and Regenerate Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onSave}
                  disabled={isSaving || bulkState.generatedWords.every(w => !w.word.trim())}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <span className="me-2">
                        <Loader size="sm" />
                      </span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 me-2" />
                      Save All Words
                    </>
                  )}
                </Button>
                <Button
                  onClick={onGenerate}
                  disabled={bulkState.isLoading}
                  variant="outline"
                  className="border-purple-400 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <RefreshCw className="w-4 h-4 me-2" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          {/* Excluded Words Info */}
          {bulkState.excludedWords.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Show excluded words (used within 30 days)
              </summary>
              <div className="mt-2 p-2 bg-gray-50 dark:bg-neo-navy-elevated/50 rounded text-xs font-mono text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                {bulkState.excludedWords.join(', ')}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
