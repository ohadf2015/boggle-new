'use client';

import React, { useCallback } from 'react';
import { CardDescription } from '../ui/card';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Language } from '../../shared/types/game';

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
  { code: 'en', flag: '\u{1F1FA}\u{1F1F8}', labelKey: 'joinView.english' },
  { code: 'he', flag: '\u{1F1EE}\u{1F1F1}', labelKey: 'joinView.hebrew' },
  { code: 'sv', flag: '\u{1F1F8}\u{1F1EA}', labelKey: 'joinView.swedish' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}', labelKey: 'joinView.japanese' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', labelKey: 'joinView.spanish' },
];

/**
 * LanguageSelector - Grid of language buttons for host mode
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = React.memo(({
  selectedLanguage,
  onLanguageChange
}) => {
  const { t } = useLanguage();

  const handleClick = useCallback((code: Language) => {
    onLanguageChange(code);
  }, [onLanguageChange]);

  return (
    <div className="space-y-2">
      <CardDescription className="text-sm sm:text-base font-bold uppercase text-neo-cream">
        {t('joinView.selectLanguage')}
      </CardDescription>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {LANGUAGE_OPTIONS.map(({ code, flag, labelKey }) => (
          <button
            key={code}
            type="button"
            onClick={() => handleClick(code)}
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-2.5 rounded-neo border-3 transition-all duration-100",
              selectedLanguage === code
                ? "bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm"
                : "bg-white border-neo-black text-neo-black shadow-hard-sm hover:shadow-hard hover:translate-x-[-1px] hover:translate-y-[-1px] hover:border-neo-cyan"
            )}
          >
            <span className="text-base leading-none">{flag}</span>
            <span className="font-bold text-[10px] uppercase leading-none">{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

LanguageSelector.displayName = 'LanguageSelector';

export default LanguageSelector;
