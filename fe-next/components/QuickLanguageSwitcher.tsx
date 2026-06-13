'use client';

import { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { trackLanguageChanged } from '@/utils/growthTracking';
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
 * QuickLanguageSwitcher - Neo-Brutalist language selector for header/menu
 *
 * Shows current language flag and allows quick switching between languages.
 * Features chunky borders, hard shadows, and playful hover states.
 * Memoized to prevent unnecessary re-renders.
 */
export const QuickLanguageSwitcher = memo<QuickLanguageSwitcherProps>(({
  className,
  showLabel = false,
  compact = false,
}) => {
  const { language, setLanguage, t, currentFlag, dir } = useLanguage();

  const selectedOption = LANGUAGE_OPTIONS.find(opt => opt.code === language);

  return (
    <Select
      // Forward text direction straight to Radix (resolved as dirProp ??
      // contextDir ?? 'ltr'). Radix Select is unconditionally modal in this
      // version — it locks <body> and aria-hides every sibling while open — so
      // if the popper ever computes its placement with LTR collision math on an
      // RTL page it renders off-screen and the whole page looks blank & frozen
      // (the reported "tap flag on /he → screen disappears" bug). The global
      // RadixDirectionProvider already supplies this, but binding dir at the
      // component guarantees correct RTL placement even if that context is ever
      // out of reach for this Select.
      dir={dir}
      value={language}
      onValueChange={(val) => {
        trackLanguageChanged(language, val);
        setLanguage(val as Language);
      }}
    >
      <SelectTrigger
        className={cn(
          "flex items-center justify-center gap-1",
          compact ? "w-10 h-10 px-0" : showLabel ? "w-auto h-10 px-3" : "w-14 h-10 px-1.5",
          // Neo-brutalist base styling
          "bg-neo-cream text-neo-black dark:bg-neo-navy-elevated dark:text-white",
          "border-3 border-neo-black dark:border-slate-500",
          "rounded-neo shadow-hard-sm",
          // Hover: lift up with bigger shadow
          "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard",
          "hover:bg-neo-lime/40 dark:hover:bg-neo-lime/20",
          // Active: press down
          "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          "transition-all duration-100",
          // Focus ring
          "focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2",
          // Override default SelectTrigger chevron
          "[&>svg:last-child]:hidden",
          className
        )}
        aria-label={t('settings.changeLanguage')}
        title={t('settings.changeLanguage')}
      >
        <SelectValue>
          <div className="flex items-center justify-center gap-1">
            <span className={cn("leading-none", compact ? "text-lg" : "text-xl")} role="img" aria-label={selectedOption ? t(selectedOption.labelKey) : ''}>
              {currentFlag}
            </span>
            {showLabel && selectedOption && (
              <span className="font-bold text-sm">{t(selectedOption.labelKey)}</span>
            )}
            {!compact && (
              <ChevronDown className="w-4 h-4 text-neo-black/60 dark:text-white" aria-hidden="true" />
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        className={cn(
          // Override default content styling with neo-brutalist look
          "min-w-[180px]",
          "bg-neo-cream dark:bg-neo-navy-light",
          "border-3 border-neo-black dark:border-slate-500",
          "rounded-neo shadow-hard-lg",
          "p-1"
        )}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectItem
            key={option.code}
            value={option.code}
            className={cn(
              "cursor-pointer rounded-neo",
              "px-3 py-2.5",
              "font-bold text-neo-black dark:text-white",
              // Hover state - player-accent highlight (lime by default)
              "hover:bg-accent hover:text-accent-foreground",
              "focus:bg-accent focus:text-accent-foreground",
              // Selected state
              "data-[state=checked]:bg-neo-cyan data-[state=checked]:text-neo-black",
              // Remove default focus bg
              "focus:outline-hidden"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-xl leading-none"
                role="img"
                aria-label={t(option.labelKey)}
              >
                {option.flag}
              </span>
              <span className="font-bold">{t(option.labelKey)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

QuickLanguageSwitcher.displayName = 'QuickLanguageSwitcher';

export default QuickLanguageSwitcher;
