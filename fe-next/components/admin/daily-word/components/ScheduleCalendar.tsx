'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Edit2, AlertTriangle, Users, Copy, Shuffle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoLoader } from '@/components/ui/NeoLoader';
import {
  formatDate,
  getEffectiveWord,
  getDateStatus,
  type ScheduledWord,
  type AttemptSummary,
} from '../types';

interface ScheduleCalendarProps {
  dates: string[];
  wordsByDate: Map<string, ScheduledWord>;
  attemptSummaries: Record<string, AttemptSummary>;
  regeneratingBoard: string | null;
  onWordClick: (dateStr: string, word: ScheduledWord | undefined) => void;
  onCopyWord: (word: string) => void;
  onRegenerateBoard: (dateStr: string) => void;
  onViewAttempts: (dateStr: string) => void;
}

export function ScheduleCalendar({
  dates,
  wordsByDate,
  attemptSummaries,
  regeneratingBoard,
  onWordClick,
  onCopyWord,
  onRegenerateBoard,
  onViewAttempts,
}: ScheduleCalendarProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {dates.map((dateStr) => {
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
              status === 'missing' &&
                'border-amber-500 bg-amber-50 dark:bg-amber-900/20 border-dashed',
              status === 'scheduled' &&
                word?.override_word &&
                'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
              status === 'scheduled' &&
                !word?.override_word &&
                'border-green-500 bg-green-50 dark:bg-green-900/20'
            )}
            onClick={() => onWordClick(dateStr, word)}
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
                <div
                  className={cn(
                    'font-mono text-xl font-black tracking-wider',
                    status === 'live' && 'text-red-600 dark:text-red-400',
                    status === 'past' && 'text-gray-500',
                    status === 'scheduled' && 'text-neo-black dark:text-neo-cream'
                  )}
                >
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
            <div className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-neo flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (word) {
                    onCopyWord(getEffectiveWord(word));
                  }
                }}
                className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100"
                title="Copy word"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (word) {
                    onRegenerateBoard(dateStr);
                  }
                }}
                disabled={regeneratingBoard === dateStr}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
                title="Shuffle board (regenerate with new letters)"
              >
                {regeneratingBoard === dateStr ? (
                  <NeoLoader variant="dots" size="sm" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (word) {
                    onViewAttempts(dateStr);
                  }
                }}
                className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100"
                title="View attempts"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
