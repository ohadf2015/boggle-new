'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import { LANGUAGES } from '../types';

interface LanguageTabsProps {
  selectedLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageTabs({ selectedLang, onLanguageChange }: LanguageTabsProps): React.ReactElement {
  return (
    <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onLanguageChange(lang.code)}
          className={cn(
            'px-2.5 sm:px-4 py-2 rounded-neo border-2 border-neo-black font-bold transition-all flex-shrink-0 text-xs sm:text-sm min-h-[40px]',
            selectedLang === lang.code
              ? 'bg-neo-pink text-white shadow-hard'
              : 'bg-white dark:bg-gray-700 hover:shadow-hard'
          )}
        >
          <span className="mr-1">{lang.flag}</span>
          <span className="hidden xs:inline">{lang.name}</span>
          <span className="xs:hidden">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
