'use client';

import { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

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
];

interface QuickLanguageSwitcherProps {
  /** Additional CSS classes */
  className?: string;
  /** Show full language name alongside flag (for mobile menu) */
  showLabel?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

/**
 * QuickLanguageSwitcher - Compact language selector for header/menu
 *
 * Shows current language flag and allows quick switching between languages.
 * Memoized to prevent unnecessary re-renders.
 */
export const QuickLanguageSwitcher = memo<QuickLanguageSwitcherProps>(({
  className,
  showLabel = false,
  compact = false,
}) => {
  const { language, setLanguage, t, currentFlag } = useLanguage();

  const selectedOption = LANGUAGE_OPTIONS.find(opt => opt.code === language);

  return (
    <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
      <SelectTrigger
        className={cn(
          "flex items-center justify-center gap-1.5",
          compact ? "w-10 h-10 px-0" : showLabel ? "w-auto h-10 px-3" : "w-12 h-10 px-1",
          "bg-neo-cream text-neo-black dark:bg-slate-700 dark:text-white",
          "border-2 border-neo-black dark:border-slate-500",
          "rounded-neo shadow-hard-sm",
          "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard hover:bg-neo-cyan/30",
          "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
          "transition-all duration-100",
          "focus:outline-none focus:ring-2 focus:ring-neo-cyan focus:ring-offset-1",
          // Override default SelectTrigger styling that adds chevron spacing
          "[&>svg]:hidden",
          className
        )}
        aria-label={t('settings.changeLanguage') || 'Change Language'}
      >
        <SelectValue>
          <div className="flex items-center justify-center gap-1.5">
            <span className={cn("leading-none", compact ? "text-lg" : "text-xl")} role="img" aria-label={selectedOption ? t(selectedOption.labelKey) : ''}>
              {currentFlag}
            </span>
            {showLabel && selectedOption && (
              <span className="font-semibold text-sm">{t(selectedOption.labelKey)}</span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectItem
            key={option.code}
            value={option.code}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none" role="img" aria-label={t(option.labelKey)}>
                {option.flag}
              </span>
              <span className="font-medium">{t(option.labelKey)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

QuickLanguageSwitcher.displayName = 'QuickLanguageSwitcher';

export default QuickLanguageSwitcher;
