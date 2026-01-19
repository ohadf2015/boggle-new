'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Edit2,
  Save,
  X,
  Users,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Shuffle,
  Globe,
  User,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { cn } from '@/lib/utils';
import {
  formatDate,
  getEffectiveWord,
  getDateStatus,
  type ScheduledWord,
  type AttemptSummary,
  type PlayerAttempt,
  type WordSource,
} from '../types';

import { AttemptsList } from './AttemptsList';

const SOURCE_BADGE_CONFIG: Record<WordSource, { icon: React.ReactNode; label: string; className: string }> = {
  wikipedia: {
    icon: <Globe className="w-3 h-3" />,
    label: 'Wiki',
    className: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
  },
  ai: {
    icon: <Sparkles className="w-3 h-3" />,
    label: 'AI',
    className: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  admin: {
    icon: <User className="w-3 h-3" />,
    label: 'Admin',
    className: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
  static: {
    icon: <BookOpen className="w-3 h-3" />,
    label: 'Static',
    className: 'text-gray-600 bg-gray-100 dark:bg-gray-700/30',
  },
};

interface ScheduleListProps {
  dates: string[];
  wordsByDate: Map<string, ScheduledWord>;
  attemptSummaries: Record<string, AttemptSummary>;
  expandedDate: string | null;
  attempts: PlayerAttempt[];
  attemptsLoading: boolean;
  searchQuery: string;
  selectedAttempts: Set<string>;
  saving: boolean;
  regeneratingBoard: string | null;
  onQuickSave: (word: ScheduledWord, newValue: string) => Promise<void>;
  onCopyWord: (word: string) => void;
  onOpenReplaceModal: (dateStr: string, word: ScheduledWord) => void;
  onOpenAddModal: (dateStr: string) => void;
  onRegenerateBoard: (dateStr: string) => void;
  onToggleExpanded: (dateStr: string) => void;
  onClearOverride: (word: ScheduledWord) => void;
  onSearchChange: (query: string) => void;
  onToggleAttemptSelection: (id: string) => void;
  onSelectAllAttempts: () => void;
  onResetSelectedAttempts: () => void;
  onCopyResetLink: () => void;
  getFilteredAttempts: () => PlayerAttempt[];
}

export function ScheduleList({
  dates,
  wordsByDate,
  attemptSummaries,
  expandedDate,
  attempts,
  attemptsLoading,
  searchQuery,
  selectedAttempts,
  saving,
  regeneratingBoard,
  onQuickSave,
  onCopyWord,
  onOpenReplaceModal,
  onOpenAddModal,
  onRegenerateBoard,
  onToggleExpanded,
  onClearOverride,
  onSearchChange,
  onToggleAttemptSelection,
  onSelectAllAttempts,
  onResetSelectedAttempts,
  onCopyResetLink,
  getFilteredAttempts,
}: ScheduleListProps): React.ReactElement {
  const [quickEditWord, setQuickEditWord] = useState<string | null>(null);
  const [quickEditValue, setQuickEditValue] = useState('');

  const handleStartQuickEdit = (word: ScheduledWord): void => {
    setQuickEditWord(word.id);
    setQuickEditValue(getEffectiveWord(word));
  };

  const handleCancelQuickEdit = (): void => {
    setQuickEditWord(null);
    setQuickEditValue('');
  };

  const handleQuickSave = async (word: ScheduledWord): Promise<void> => {
    if (!quickEditValue.trim() || quickEditValue.length < 2) return;
    await onQuickSave(word, quickEditValue);
    setQuickEditWord(null);
    setQuickEditValue('');
  };

  return (
    <div className="space-y-3">
      {dates.map((dateStr) => {
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
              status === 'live' &&
                'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-400',
              status === 'past' && 'border-gray-300 bg-gray-100 dark:bg-gray-800',
              status === 'missing' &&
                'border-amber-500 bg-amber-50 dark:bg-amber-900/20 border-dashed',
              status === 'scheduled' &&
                word?.override_word &&
                'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
              status === 'scheduled' &&
                !word?.override_word &&
                'border-green-500 bg-green-50 dark:bg-green-900/20'
            )}
          >
            {/* Word Row */}
            <div className="p-2 sm:p-4">
              {/* Mobile: Stacked layout, Desktop: Horizontal */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                {/* Top row on mobile: Date + Word + Tags */}
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                  {/* Date Section */}
                  <div className="flex-shrink-0">
                    <div className="font-bold text-sm sm:text-lg">{formatDate(dateStr)}</div>
                    {word && <div className="text-xs text-gray-500">#{word.puzzle_number}</div>}
                  </div>

                  {/* Word Section */}
                  {word ? (
                    quickEditWord === word.id ? (
                      <div className="flex items-center gap-1 sm:gap-2 flex-1">
                        <input
                          type="text"
                          value={quickEditValue}
                          onChange={(e) => setQuickEditValue(e.target.value.toUpperCase())}
                          maxLength={15}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 border-2 sm:border-3 border-neo-black rounded-neo font-mono text-lg sm:text-2xl w-24 sm:w-40 uppercase text-center"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && quickEditValue.length >= 2) {
                              handleQuickSave(word);
                            } else if (e.key === 'Escape') {
                              handleCancelQuickEdit();
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleQuickSave(word)}
                          disabled={saving || quickEditValue.length < 2}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white p-2"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={handleCancelQuickEdit}
                          size="sm"
                          variant="outline"
                          className="p-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 sm:gap-3 cursor-pointer group flex-1 min-w-0"
                        onClick={() => handleStartQuickEdit(word)}
                        title="Click to edit"
                      >
                        <span
                          className={cn(
                            'font-mono text-xl sm:text-3xl font-black tracking-wider px-2 sm:px-4 py-1 sm:py-2 rounded-neo border-2 border-transparent group-hover:border-neo-black group-hover:bg-white dark:group-hover:bg-gray-700 transition-all truncate',
                            status === 'live' && 'text-red-600 dark:text-red-400',
                            status === 'past' && 'text-gray-500'
                          )}
                        >
                          {getEffectiveWord(word)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyWord(getEffectiveWord(word));
                          }}
                          className="opacity-0 group-hover:opacity-100 sm:transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
                          title="Copy word"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => onOpenAddModal(dateStr)}
                      className="font-mono text-lg sm:text-2xl text-gray-400 hover:text-neo-pink transition-colors flex items-center gap-1 sm:gap-2"
                    >
                      <span className="px-2 sm:px-4 py-1 sm:py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-neo">
                        ----
                      </span>
                      <span className="text-xs sm:text-sm font-sans">+ Add</span>
                    </button>
                  )}

                  {/* Tags - Show LIVE always, others only on larger screens */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {status === 'live' && (
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full font-bold animate-pulse">
                        LIVE
                      </span>
                    )}
                    {word?.override_word && (
                      <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                        <Edit2 className="w-3 h-3" /> Override
                      </span>
                    )}
                    {word?.word_source && !word.override_word && (
                      <a
                        href={word.source_article_url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                          SOURCE_BADGE_CONFIG[word.word_source].className,
                          word.source_article_url && 'hover:underline cursor-pointer'
                        )}
                        onClick={(e) => !word.source_article_url && e.preventDefault()}
                      >
                        {SOURCE_BADGE_CONFIG[word.word_source].icon}
                        {SOURCE_BADGE_CONFIG[word.word_source].label}
                      </a>
                    )}
                    {word?.theme_context && (
                      <span className="hidden md:inline px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                        {word.theme_context}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom row on mobile: Stats + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-shrink-0">
                  {/* Attempt Summary - Compact on mobile */}
                  {summary && (
                    <div
                      className={cn(
                        'flex items-center gap-1 sm:gap-3 px-2 sm:px-3 py-1 sm:py-2 rounded-neo border-2 text-xs sm:text-sm',
                        summary.total > 0
                          ? 'border-gray-300 bg-white dark:bg-gray-700'
                          : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <span className="font-bold">{summary.total}</span>
                      </div>
                      {summary.total > 0 && (
                        <>
                          <div className="w-px h-3 sm:h-4 bg-gray-300" />
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-green-600 font-bold">{summary.solved}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-red-500 font-bold">{summary.failed}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action Buttons - Icon only on mobile */}
                  {word && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        onClick={() => onOpenReplaceModal(dateStr, word)}
                        size="sm"
                        className={cn(
                          'text-white p-2 sm:px-3',
                          status === 'live'
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-amber-500 hover:bg-amber-600'
                        )}
                        title="Replace word and optionally reset attempts"
                      >
                        <RotateCcw className="w-4 h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Replace</span>
                      </Button>

                      <Button
                        onClick={() => onRegenerateBoard(dateStr)}
                        disabled={regeneratingBoard === dateStr}
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 sm:px-3"
                        title="Regenerate board with new letter arrangement (keeps same target word)"
                      >
                        {regeneratingBoard === dateStr ? (
                          <NeoLoader variant="dots" size="sm" className="sm:mr-1" />
                        ) : (
                          <Shuffle className="w-4 h-4 sm:mr-1" />
                        )}
                        <span className="hidden sm:inline">Shuffle</span>
                      </Button>

                      <Button
                        onClick={() => onToggleExpanded(dateStr)}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-0.5 sm:gap-1 p-2 sm:px-3"
                      >
                        <Users className="w-4 h-4" />
                        {expandedDate === dateStr ? (
                          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        ) : (
                          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </Button>

                      {word.override_word && (
                        <Button
                          onClick={() => onClearOverride(word)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 p-2"
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
                <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:ml-20 italic truncate">
                  &quot;{word.ai_reason}&quot;
                </p>
              )}
            </div>

            {/* Expanded Attempts Section */}
            {word && (
              <AttemptsList
                isExpanded={expandedDate === dateStr}
                attempts={attempts}
                attemptsLoading={attemptsLoading}
                searchQuery={searchQuery}
                selectedAttempts={selectedAttempts}
                saving={saving}
                onSearchChange={onSearchChange}
                onToggleSelection={onToggleAttemptSelection}
                onSelectAll={onSelectAllAttempts}
                onResetSelected={onResetSelectedAttempts}
                onCopyResetLink={onCopyResetLink}
                getFilteredAttempts={getFilteredAttempts}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
