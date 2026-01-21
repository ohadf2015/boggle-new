'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortField, SortOrder } from '../types';

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  isRTL: boolean;
}

export function SortableHeader({
  label,
  field,
  currentField,
  sortOrder,
  onSort,
  isRTL,
}: SortableHeaderProps) {
  const isActive = currentField === field;

  return (
    <th
      className="px-4 py-3 text-left text-sm font-neo-display text-slate-300 cursor-pointer hover:text-neo-white transition-colors"
      onClick={() => onSort(field)}
    >
      <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
        {label}
        <ArrowUpDown
          className={cn('w-3 h-3', isActive ? 'text-neo-lime' : 'text-slate-500')}
        />
        {isActive && (
          <span className="text-xs text-neo-lime">
            {sortOrder === 'desc' ? '↓' : '↑'}
          </span>
        )}
      </div>
    </th>
  );
}
