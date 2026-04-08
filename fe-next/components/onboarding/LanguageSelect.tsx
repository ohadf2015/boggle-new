'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_GAME_LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

interface LanguageSelectProps {
  onSelect: () => void;
}

/**
 * LanguageSelect — First step in the FTUE onboarding flow.
 * Brand-forward welcome with animated logo, language cards, and a strong CTA.
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({ onSelect }) => {
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<Language>(language);

  const handleSelect = (lang: Language) => {
    setSelected(lang);
    setLanguage(lang);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-sm mx-auto gap-5">
      {/* Brand hero — animated LexiClash wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="text-center mb-1"
      >
        <motion.h1
          className="text-4xl font-neo-display font-black text-neo-lime tracking-tight"
          style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.3)' }}
          animate={{ rotate: [0, -1.5, 1.5, 0] }}
          transition={{ delay: 0.6, duration: 0.5, ease: 'easeInOut' }}
        >
          LexiClash
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-neo-cream/60 text-sm font-neo-body mt-1"
        >
          {t('onboarding.ftue.chooseLanguage', 'Choose your language')}
        </motion.p>
      </motion.div>

      {/* Language cards — two-column grid for 4 languages */}
      <div className="grid grid-cols-2 gap-2.5 w-full px-1">
        {SUPPORTED_GAME_LANGUAGES.map((lang, i) => {
          const config = LANGUAGE_CONFIG[lang];
          const isSelected = selected === lang;

          return (
            <motion.button
              key={lang}
              data-testid={`lang-${lang}`}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 350, damping: 22 }}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(lang)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 px-3 py-4 rounded-neo border-3',
                'font-neo-body transition-all overflow-hidden',
                isSelected
                  ? 'bg-neo-lime/15 border-neo-lime text-neo-cream shadow-hard-sm'
                  : 'bg-neo-navy-light border-neo-cream/15 text-neo-cream/60 hover:border-neo-cream/30'
              )}
            >
              {/* Selection check badge */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute top-1.5 inset-e-1.5 w-5 h-5 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                </motion.div>
              )}

              <span className="text-3xl leading-none" role="img" aria-label={config.name}>
                {config.flag}
              </span>
              <span className={cn(
                'text-sm font-bold',
                isSelected && 'text-neo-cream'
              )}>
                {config.nativeName}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* CTA button */}
      <motion.button
        data-testid="language-continue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={onSelect}
        className={cn(
          'mt-1 w-full py-3.5 rounded-neo border-3 border-neo-black',
          'bg-neo-lime text-neo-navy font-neo-display font-black text-lg uppercase tracking-wide',
          'shadow-hard active:shadow-hard-pressed active:translate-y-[2px]',
          'transition-shadow flex items-center justify-center gap-2'
        )}
      >
        {t('onboarding.ftue.letsPlay', "Let's Play")}
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default LanguageSelect;
