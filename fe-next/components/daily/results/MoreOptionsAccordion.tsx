/**
 * MoreOptionsAccordion Component
 * Collapsible section for secondary actions (create puzzle, try another language, etc.)
 * Keeps main results page clean while providing access to additional features
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wand2, Globe, Gamepad2 } from 'lucide-react';
import type { Language } from '@/types';

export interface MoreOptionsAccordionProps {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether the user won */
  solved: boolean;
  /** Current game language */
  currentLanguage: Language;
  /** Callback when user wants to create a puzzle */
  onCreatePuzzle: () => void;
  /** Callback when user changes game language (optional) */
  onGameLanguageChange?: (lang: Language) => void;
  /** Translation function */
  t: (key: string) => string;
}

const AVAILABLE_LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
];

export const MoreOptionsAccordion: React.FC<MoreOptionsAccordionProps> = ({
  isAuthenticated,
  solved,
  currentLanguage,
  onCreatePuzzle,
  onGameLanguageChange,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const otherLanguages = AVAILABLE_LANGUAGES.filter(lang => lang.code !== currentLanguage);

  return (
    <div className="rounded-neo border-2 border-slate-700/50 overflow-hidden">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
      >
        <span className="text-sm font-bold text-slate-300">
          {t('common.advancedSettings')}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-slate-900/50">
              {/* Create Your Own Puzzle - Winners only, authenticated only */}
              {solved && isAuthenticated && (
                <button
                  onClick={onCreatePuzzle}
                  className="w-full flex items-center gap-3 p-3 bg-linear-to-r from-neo-pink/10 to-neo-orange/10 rounded-neo border border-slate-700 hover:border-neo-pink/50 transition-colors group text-start"
                >
                  <div className="w-9 h-9 shrink-0 bg-linear-to-br from-neo-pink to-neo-orange rounded-lg flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white group-hover:text-neo-lime transition-colors">
                      {t('customPuzzle.createYourOwn')}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t('customPuzzle.createDescription')}
                    </div>
                  </div>
                </button>
              )}

              {/* Try Another Language */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('wordHunt.results.tryAnotherLanguage')}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {otherLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => onGameLanguageChange?.(lang.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 hover:border-neo-cyan/50 hover:bg-slate-700/80 transition-colors"
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-xs font-medium text-slate-300">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Keep Playing CTA */}
              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>{t('daily.keepPlaying')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MoreOptionsAccordion;
