'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDateRangeInfo } from '../types';

interface DateNavigationProps {
  daysToShow: number;
  dateOffset: number;
  onDaysToShowChange: (days: number) => void;
  onDateOffsetChange: (offset: number) => void;
}

export function DateNavigation({
  daysToShow,
  dateOffset,
  onDaysToShowChange,
  onDateOffsetChange,
}: DateNavigationProps): React.ReactElement {
  const dateRange = getDateRangeInfo(daysToShow, dateOffset);

  const handlePreviousWeek = (): void => {
    onDateOffsetChange(dateOffset - 7);
  };

  const handleNextWeek = (): void => {
    onDateOffsetChange(Math.min(dateOffset + 7, 0));
  };

  const handleGoToToday = (): void => {
    onDateOffsetChange(0);
  };

  return (
    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between mb-4 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-neo border-2 border-gray-200 dark:border-gray-700 gap-2">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={handlePreviousWeek}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
          title="Previous week"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" />
        </button>
        <span className="font-bold text-xs sm:text-sm whitespace-nowrap">
          {dateRange.start} - {dateRange.end}
        </span>
        <button
          onClick={handleNextWeek}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
          title="Next week"
          disabled={dateOffset >= 0}
        >
          <ChevronRight
            className={cn('w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180', dateOffset >= 0 && 'opacity-30')}
          />
        </button>
        {dateOffset !== 0 && (
          <button
            onClick={handleGoToToday}
            className="ml-1 sm:ml-2 text-xs text-neo-pink hover:underline font-bold whitespace-nowrap"
          >
            Today
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs sm:text-sm text-gray-500 hidden xs:inline">Show:</span>
        <select
          value={daysToShow}
          onChange={(e) => onDaysToShowChange(Number(e.target.value))}
          className="text-xs sm:text-sm border-2 border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 min-h-[32px]"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>
    </div>
  );
}
