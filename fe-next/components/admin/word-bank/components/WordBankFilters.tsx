'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';

interface WordBankFiltersProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  selectedStatus: 'all' | 'active' | 'blocked' | 'used';
  onStatusChange: (status: 'all' | 'active' | 'blocked' | 'used') => void;
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
  selectedSource,
  onSourceChange,
  searchQuery,
  onSearchChange,
}: WordBankFiltersProps): React.ReactElement {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-800 border-2 border-gray-700 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Language Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.language')}</label>
          <select
            value={selectedLanguage}
            onChange={e => onLanguageChange(e.target.value as Language)}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neo-yellow"
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.status')}</label>
          <select
            value={selectedStatus}
            onChange={e => onStatusChange(e.target.value as typeof selectedStatus)}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neo-yellow"
          >
            {STATUSES.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.source')}</label>
          <select
            value={selectedSource}
            onChange={e => onSourceChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neo-yellow"
          >
            {SOURCES.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">{t('admin.wordBank.filters.searchLabel')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('admin.wordBank.filters.search')}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-neo-yellow"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
