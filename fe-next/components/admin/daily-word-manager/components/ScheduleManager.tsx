'use client';

import React from 'react';
import { Calendar, RefreshCw, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import type { DailyTargetWord } from '../types';
import { formatDateDisplay } from '../constants';

interface ScheduleManagerProps {
  schedule: DailyTargetWord[];
  isLoading: boolean;
  editingDate: string | null;
  editWordValue: string;
  isSaving: boolean;
  onRefresh: () => void;
  onStartEdit: (date: string, currentWord: string) => void;
  onCancelEdit: () => void;
  onEditWordChange: (value: string) => void;
  onSaveWord: (date: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  schedule,
  isLoading,
  editingDate,
  editWordValue,
  isSaving,
  onRefresh,
  onStartEdit,
  onCancelEdit,
  onEditWordChange,
  onSaveWord,
}) => {
  return (
    <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-base sm:text-lg">Daily Schedule</h3>
        </div>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? (
            <Loader size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pe-2">
        {schedule.map(item => {
          const dateObj = new Date(item.puzzle_date);
          const isToday = new Date().toISOString().split('T')[0] === item.puzzle_date;
          const isPast = dateObj < new Date(new Date().setHours(0, 0, 0, 0)) && !isToday;
          const activeWord = item.override_word || item.target_word;
          const isEditing = editingDate === item.puzzle_date;

          return (
            <div
              key={item.id}
              className={cn(
                'p-3 rounded-lg border flex flex-col gap-2 relative',
                isToday
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : isPast
                    ? 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-neo-navy-light opacity-60'
                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-neo-navy-elevated'
              )}
            >
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    'text-xs font-mono',
                    isToday && 'font-bold text-purple-700 dark:text-purple-300'
                  )}
                >
                  {formatDateDisplay(item.puzzle_date)}
                </span>
                {item.override_word && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full"
                    title="Manually overridden"
                  >
                    Manual
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="flex gap-1">
                  <input
                    autoFocus
                    className="w-full text-sm px-1 py-1 border rounded uppercase font-mono bg-white text-black"
                    value={editWordValue}
                    onChange={e => onEditWordChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onSaveWord(item.puzzle_date);
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => onSaveWord(item.puzzle_date)}
                    aria-label="Save word"
                    className="p-1 text-green-600 hover:text-green-700 rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-green-500"
                    disabled={isSaving}
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    aria-label="Cancel edit"
                    className="p-1 text-red-500 hover:text-red-700 rounded focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center group min-h-[28px]">
                  <span className="font-bold font-mono text-lg">{activeWord}</span>
                  <button
                    type="button"
                    onClick={() => onStartEdit(item.puzzle_date, activeWord)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500 focus:opacity-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
                    aria-label="Edit word"
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {item.ai_reason && !item.override_word && (
                <p className="text-[10px] text-gray-400 truncate" title={item.ai_reason}>
                  {item.ai_reason}
                </p>
              )}
            </div>
          );
        })}
        {schedule.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-8 text-gray-500">
            No words scheduled. Use the Bulk Generator below.
          </div>
        )}
      </div>
    </div>
  );
};
