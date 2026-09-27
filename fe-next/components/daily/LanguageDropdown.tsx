'use client';

import React, { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

export const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  // ru intentionally omitted: daily-word generation (bulk-generate route) does not
  // produce Russian puzzles, so the daily picker must not offer a language with no content.
];

interface LanguageDropdownProps {
  language: Language;
  currentFlag: string;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  language,
  currentFlag,
  onLanguageChange,
}) => {
  const [open, setOpen] = useState(false);
  const completedCount = LANGUAGE_OPTIONS.filter((o) => hasPlayedWordHuntToday(o.code)).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative flex items-center gap-2 bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all min-w-[44px] min-h-[44px]"
        >
          <span className="text-lg">{currentFlag}</span>
          <Globe className="w-4 h-4 text-neo-black" />
          <ChevronDown className={`w-3 h-3 text-neo-black transition-transform ${open ? 'rotate-180' : ''}`} />
          {completedCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-neo-lime text-neo-black rounded-full border-2 border-neo-black flex items-center justify-center text-xs font-black">
              {completedCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[140px] bg-neo-cream border-3 border-neo-black rounded-neo shadow-hard-lg text-neo-black"
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const played = hasPlayedWordHuntToday(option.code);
          return (
            <DropdownMenuItem
              key={option.code}
              onSelect={() => onLanguageChange(option.code)}
              className={`gap-2 hover:bg-neo-cyan/30 focus:bg-neo-cyan/30 ${
                language === option.code ? 'bg-neo-cyan/50 font-bold' : ''
              }`}
            >
              <span className="text-lg">{option.flag}</span>
              <span className="text-sm text-neo-black">{option.name}</span>
              {played && <Check className="w-4 h-4 ms-auto text-neo-lime" strokeWidth={3} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageDropdown;
