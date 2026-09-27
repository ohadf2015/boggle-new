'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Language } from '@/types';
import type { ValidationStatus } from '../types';

interface WordBankFiltersProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  selectedStatus: 'all' | 'active' | 'blocked' | 'used';
  onStatusChange: (status: 'all' | 'active' | 'blocked' | 'used') => void;
  selectedValidationStatus: 'all' | ValidationStatus;
  onValidationStatusChange: (status: 'all' | ValidationStatus) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];
const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'used', label: 'Used' },
];
const VALIDATION_STATUSES = [
  { value: 'all', label: 'All Validation' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'wikipedia', label: 'Wikipedia' },
  { value: 'dictionary', label: 'Dictionary' },
  { value: 'static', label: 'Static' },
  { value: 'admin', label: 'Admin' },
  { value: 'ai', label: 'AI' },
];

export function WordBankFilters({
  selectedLanguage,
  onLanguageChange,
  selectedStatus,
  onStatusChange,
  selectedValidationStatus,
  onValidationStatusChange,
  selectedSource,
  onSourceChange,
  searchQuery,
  onSearchChange,
}: WordBankFiltersProps): React.ReactElement {
  const { t } = useLanguage();

  return (
    <div className="bg-neo-navy-light border-2 border-gray-700 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Language Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.language')}</label>
          <Select value={selectedLanguage} onValueChange={v => onLanguageChange(v as Language)}>
            <SelectTrigger className="w-full bg-neo-navy border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang} value={lang}>
                  {lang.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.status')}</label>
          <Select value={selectedStatus} onValueChange={v => onStatusChange(v as typeof selectedStatus)}>
            <SelectTrigger className="w-full bg-neo-navy border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Validation Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.validationStatus')}</label>
          <Select value={selectedValidationStatus} onValueChange={v => onValidationStatusChange(v as typeof selectedValidationStatus)}>
            <SelectTrigger className="w-full bg-neo-navy border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VALIDATION_STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.source')}</label>
          <Select value={selectedSource} onValueChange={onSourceChange}>
            <SelectTrigger className="w-full bg-neo-navy border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map(source => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div>
          <label htmlFor="word-search-input" className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.filters.searchLabel')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="word-search-input"
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('admin.wordBank.filters.search')}
              className="w-full bg-neo-navy border border-gray-700 text-white rounded-lg ps-10 pe-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
