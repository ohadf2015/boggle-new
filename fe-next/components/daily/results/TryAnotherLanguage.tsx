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
    <div className="mt-6 p-4 bg-linear-to-br from-neo-cyan/10 via-neo-purple/10 to-neo-pink/10 border-3 border-neo-black rounded-neo shadow-hard">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 shrink-0 bg-linear-to-br from-neo-cyan to-neo-purple rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
          <span className="text-xl">🌍</span>
        </div>
        <div className="flex-1">
          <h3 className="font-black text-base text-white uppercase tracking-tight">
            {t('wordHunt.results.tryAnotherLanguage')}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('wordHunt.results.playDifferentLanguage')}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableLanguages.map((option) => (
          <Button
            key={option.code}
            onClick={() => handleLanguageClick(option.code)}
            className="px-4 py-2.5 bg-linear-to-r from-neo-cyan to-neo-purple hover:from-neo-cyan/90 hover:to-neo-purple/90 text-white font-bold text-sm border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all flex items-center gap-2"
          >
            <span className="text-lg">{option.flag}</span>
            <span className="uppercase tracking-wide">{option.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
