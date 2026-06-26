'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import { LANGUAGES } from '../constants';

interface LanguageSelectorProps {
  selectedLang: Language;
  onSelectLang: (lang: Language) => void;
  wordCounts: Record<Language, number>;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLang,
  onSelectLang,
  wordCounts,
}) => {
  return (
    <div className="bg-white dark:bg-neo-navy-light/50 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 mb-4 text-gray-900 dark:text-white">
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {LANGUAGES.map(lang => (
          <button
            type="button"
            key={lang.code}
            onClick={() => onSelectLang(lang.code)}
            className={cn(
              'px-2.5 sm:px-4 py-2 rounded-lg border-2 font-bold transition-all shrink-0 text-xs sm:text-sm min-h-[40px]',
              selectedLang === lang.code
                ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                : 'bg-white dark:bg-neo-navy-elevated border-gray-300 dark:border-slate-600 hover:border-purple-400 text-gray-800 dark:text-gray-200'
            )}
          >
            <span className="me-1">{lang.flag}</span>
            <span className="hidden xs:inline">{lang.name}</span>
            <span className="xs:hidden">{lang.code.toUpperCase()}</span>
            <span className="ms-1 opacity-70">({wordCounts[lang.code] || 0})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
