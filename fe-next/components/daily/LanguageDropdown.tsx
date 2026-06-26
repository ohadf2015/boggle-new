'use client';

import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NeoPanel } from '@/components/ui/panel';
import { hasPlayedWordHuntToday } from '@/utils/dailyChallenge';
import type { Language } from '@/types';

export const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
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
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
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

      <AnimatePresence>
        {open && (
          <NeoPanel asChild tone="cream" shadow="lg" className="absolute top-full right-0 mt-2 z-[100] overflow-hidden min-w-[140px]">
          <m.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const played = hasPlayedWordHuntToday(option.code);
              return (
                <button
                  type="button"
                  key={option.code}
                  onClick={() => {
                    onLanguageChange(option.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neo-cyan/30 transition-colors ${
                    language === option.code ? 'bg-neo-cyan/50 font-bold' : ''
                  }`}
                >
                  <span className="text-lg">{option.flag}</span>
                  <span className="text-sm text-neo-black">{option.name}</span>
                  {played && <Check className="w-4 h-4 ms-auto text-neo-lime" strokeWidth={3} />}
                </button>
              );
            })}
          </m.div>
          </NeoPanel>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageDropdown;
