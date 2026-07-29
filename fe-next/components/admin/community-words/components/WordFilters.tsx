'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LANGUAGES } from '../constants';

interface WordFiltersProps {
  searchQuery: string;
  statusFilter: string;
  langFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onLangChange: (value: string) => void;
}

export function WordFilters({
  searchQuery,
  statusFilter,
  langFilter,
  onSearchChange,
  onStatusChange,
  onLangChange,
}: WordFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-neo-navy-light text-black dark:text-white p-4 rounded-lg shadow-xs">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search words..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending_review">Pending Review</SelectItem>
          <SelectItem value="validated">Validated</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
        </SelectContent>
      </Select>

      <Select value={langFilter} onValueChange={onLangChange}>
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Languages</SelectItem>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
