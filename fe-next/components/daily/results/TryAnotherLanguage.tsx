/**
 * TryAnotherLanguage Component
 * Shows available languages the player can still try today
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_OPTIONS } from './constants';
import type { Language } from '@/types';

interface TryAnotherLanguageProps {
  currentLanguage: Language;
  onGameLanguageChange?: (lang: Language) => void;
}

export const TryAnotherLanguage: React.FC<TryAnotherLanguageProps> = ({
  currentLanguage,
  onGameLanguageChange,
}) => {
  const { t } = useLanguage();

  // Get languages that haven't been played today
  const availableLanguages = LANGUAGE_OPTIONS.filter(
    (option) => option.code !== currentLanguage && !hasPlayedWordHuntToday(option.code)
  );

  // If no other languages available, don't show this section
  if (availableLanguages.length === 0) {
    return null;
  }

  const handleLanguageClick = (langCode: Language) => {
    if (onGameLanguageChange) {
      onGameLanguageChange(langCode);
    }
  };

  return (
    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-2 flex items-center gap-1.5">
        🌍 {t('wordHunt.results.tryAnotherLanguage')}
      </h3>
      <div className="flex flex-wrap justify-center gap-2">
        {availableLanguages.map((option) => (
          <Button
            key={option.code}
            onClick={() => handleLanguageClick(option.code)}
            className="px-3 py-2 bg-slate-600 text-white border-2 border-neo-black rounded-neo shadow-hard-sm hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <span className="text-base">{option.flag}</span>
            <span className="font-bold text-xs">{option.name}</span>
          </Button>
        ))}
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 text-center">
        {t('wordHunt.results.playDifferentLanguage')}
      </p>
    </div>
  );
};
