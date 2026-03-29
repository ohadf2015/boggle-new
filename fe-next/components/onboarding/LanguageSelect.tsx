'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_GAME_LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languageConfig';
import type { Language } from '@/types';

interface LanguageSelectProps {
  onSelect: () => void;
}

/**
 * LanguageSelect — First step in the FTUE onboarding flow.
 * Shows all supported game languages with flags and native names.
 * The user's current language is pre-selected; tapping another switches it.
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({ onSelect }) => {
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<Language>(language);

  const handleSelect = (lang: Language) => {
    setSelected(lang);
    setLanguage(lang);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-sm mx-auto gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <motion.h1
          className="text-3xl font-neo-display text-neo-lime mb-2"
        >
          🌍
        </motion.h1>
        <motion.p
          className="text-neo-cream/80 text-lg font-neo-body"
        >
          {t('onboarding.ftue.chooseLanguage', 'Choose your language')}
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 w-full px-2">
        {SUPPORTED_GAME_LANGUAGES.map((lang, i) => {
          const config = LANGUAGE_CONFIG[lang];
          const isSelected = selected === lang;

          return (
            <motion.button
              key={lang}
              data-testid={`lang-${lang}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              onClick={() => handleSelect(lang)}
              className={`
                flex items-center gap-4 px-5 py-4 rounded-neo border-neo
                font-neo-body text-lg transition-all
                ${isSelected
                  ? 'bg-neo-lime/15 border-neo-lime ring-2 ring-neo-lime text-neo-cream'
                  : 'bg-neo-navy-light border-neo-cream/20 text-neo-cream/70 hover:border-neo-cream/40'
                }
              `}
            >
              <span className="text-2xl" role="img" aria-label={config.name}>
                {config.flag}
              </span>
              <span className="flex-1 text-left">{config.nativeName}</span>
              {isSelected && (
                <span className="text-neo-lime text-xl">✓</span>
              )}
            </motion.button>
          );
        })}
      </div>

      <motion.button
        data-testid="language-continue"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onSelect}
        className="
          mt-2 px-8 py-3 rounded-neo border-neo border-black
          bg-neo-lime text-neo-navy font-neo-display text-xl
          shadow-hard active:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]
          transition-all
        "
      >
        →
      </motion.button>
    </div>
  );
};

export default LanguageSelect;
