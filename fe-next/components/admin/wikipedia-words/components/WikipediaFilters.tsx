'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import { SUPPORTED_LANGUAGES, type ValidationStatus, type LanguageOption } from '../types';

interface WikipediaFiltersProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  selectedStatus: 'all' | ValidationStatus;
  onStatusChange: (status: 'all' | ValidationStatus) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const STATUS_OPTIONS: { value: 'all' | ValidationStatus; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-slate-500' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'valid', label: 'Valid', color: 'bg-green-500' },
  { value: 'invalid', label: 'Invalid', color: 'bg-red-500' },
];

export function WikipediaFilters({
  selectedLanguage,
  onLanguageChange,
  selectedStatus,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
}: WikipediaFiltersProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {/* Language Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {SUPPORTED_LANGUAGES.map((lang: LanguageOption) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => onLanguageChange(lang.code)}
            className={cn(
              'px-3 py-2 rounded-lg border-2 font-bold transition-all shrink-0 text-sm min-h-[40px]',
              selectedLanguage === lang.code
                ? 'bg-neo-pink text-white border-neo-pink shadow-hard-sm'
                : 'bg-white dark:bg-neo-navy-elevated border-gray-300 dark:border-slate-600 hover:border-neo-pink text-gray-800 dark:text-gray-200'
            )}
          >
            <span className="me-1">{lang.flag}</span>
            <span className="hidden sm:inline">{lang.name}</span>
            <span className="sm:hidden">{lang.code.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onStatusChange(option.value)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                  selectedStatus === option.value
                    ? `${option.color} text-white border-transparent`
                    : 'bg-white dark:bg-neo-navy-elevated border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 flex-1">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value })
            }
            className="px-2 py-1.5 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-neo-navy-elevated text-gray-800 dark:text-gray-200"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value })
            }
            className="px-2 py-1.5 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-neo-navy-elevated text-gray-800 dark:text-gray-200"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words..."
            className="w-full ps-9 pe-3 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-neo-navy-elevated text-gray-800 dark:text-gray-200"
          />
        </div>
      </div>
    </div>
  );
}
