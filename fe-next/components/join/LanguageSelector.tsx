'use client';

import React, { memo, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/shared/types/game';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  /** Hide the internal label (use when parent provides its own label) */
  hideLabel?: boolean;
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
  { code: 'es', flag: '🇪🇸', labelKey: 'joinView.spanish' },
  { code: 'ru', flag: '🇷🇺', labelKey: 'joinView.russian' },
];

/**
 * Compact language selection dropdown for host mode
 * Memoized to prevent unnecessary re-renders
 */
export const LanguageSelector = memo<LanguageSelectorProps>(({
  selectedLanguage,
  onLanguageChange,
  hideLabel = false,
}) => {
  const { t } = useLanguage();

  const selectedOption = LANGUAGE_OPTIONS.find(opt => opt.code === selectedLanguage);

  return (
    <div className="space-y-1.5">
      {!hideLabel && (
        <Label className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
          {t('joinView.selectLanguage')}
        </Label>
      )}
      <Select value={selectedLanguage} onValueChange={(val) => onLanguageChange(val as Language)}>
        <SelectTrigger className="h-10 bg-slate-100 dark:bg-neo-navy-elevated/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
          <SelectValue>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg leading-none">{selectedOption?.flag}</span>
              <span className="font-semibold text-sm">{selectedOption ? t(selectedOption.labelKey) : ''}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{option.flag}</span>
                <span className="font-medium">{t(option.labelKey)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

LanguageSelector.displayName = 'LanguageSelector';

export default LanguageSelector;
