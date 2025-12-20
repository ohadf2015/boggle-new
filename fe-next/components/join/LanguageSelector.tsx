'use client';

import React from 'react';
import { CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/shared/types/game';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

interface LanguageOption {
  code: Language;
  flag: string;
  labelKey: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', flag: '🇺🇸', labelKey: 'joinView.english' },
  { code: 'he', flag: '🇮🇱', labelKey: 'joinView.hebrew' },
  { code: 'sv', flag: '🇸🇪', labelKey: 'joinView.swedish' },
  { code: 'ja', flag: '🇯🇵', labelKey: 'joinView.japanese' },
];

/**
 * Language selection grid for host mode
 */
export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-2">
      <CardDescription className="text-sm font-bold uppercase text-neo-black/70 dark:text-neo-white/70">
        {t('joinView.selectLanguage')}
      </CardDescription>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.code}
            type="button"
            onClick={() => onLanguageChange(option.code)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-neo border-3 transition-all duration-100",
              selectedLanguage === option.code
                ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard"
                : "bg-white dark:bg-slate-600 border-neo-black dark:border-slate-500 text-neo-black dark:text-neo-white shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
            )}
          >
            <span className="text-2xl">{option.flag}</span>
            <span className="font-bold text-xs uppercase">{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
