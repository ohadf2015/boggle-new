'use client';

import React, { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_GAME_LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { cn } from '@/lib/utils';
import { fireOnboardingBurst } from '@/utils/confettiUtils';
import type { Language } from '@/types';

interface LanguageSelectProps {
  onSelect: () => void;
  onPlayNow?: () => void;
}

/**
 * LanguageSelect — First step in the FTUE onboarding flow.
 * Brand-forward welcome with animated logo, language cards, and a strong CTA.
 */
const LanguageSelect: React.FC<LanguageSelectProps> = ({ onSelect }) => {
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<Language>(language);

  const handleSelect = useCallback((lang: Language) => {
    if (lang === selected) {
      // Tap-again confirms selection. Skip navigation so the router.push
      // to `/{locale}` doesn't remount [locale]/PageClient and bounce the
      // user back to this step.
      if (lang !== language) {
        setLanguage(lang, { skipNavigation: true });
      }
      onSelect();
      return;
    }
    setSelected(lang);
    fireOnboardingBurst({ y: 0.45 });
  }, [selected, onSelect, setLanguage, language]);

  const handleConfirm = useCallback(() => {
    fireOnboardingBurst({ y: 0.7 }, ['#BFFF00', '#FFE135', '#00FFFF']);
    if (selected !== language) {
      setLanguage(selected, { skipNavigation: true });
    }
    onSelect();
  }, [selected, language, setLanguage, onSelect]);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] max-w-sm lg:max-w-2xl mx-auto gap-5 lg:gap-7',
        // Desktop/tablet only: frame the step in a bounded panel so it reads as an
        // intentional card instead of buttons floating in an empty viewport. Mobile
        // stays full-bleed (unchanged) — it's already sized right for a small screen.
        'sm:rounded-neo-lg sm:border-3 sm:border-neo-black sm:bg-neo-navy-light sm:shadow-hard-lg sm:px-10 sm:py-12 lg:px-14 lg:py-16'
      )}
    >
      {/* Brand hero — animated LexiClash wordmark */}
      <m.div
        initial={{ opacity: 0, y: -16, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="text-center mb-1 relative"
      >
        {/* Soft breathing halo behind the wordmark */}
        <m.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[160%] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(191,255,0,0.25) 0%, transparent 60%)' }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <m.h1
          className="relative text-4xl lg:text-6xl font-neo-display font-black text-neo-lime tracking-tight"
          style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.3)' }}
          animate={{ rotate: [0, -1.5, 1.5, 0] }}
          transition={{ delay: 0.6, duration: 0.5, ease: 'easeInOut' }}
        >
          LexiClash
        </m.h1>
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-neo-white text-sm lg:text-base font-neo-body mt-1 lg:mt-2"
        >
          {t('onboarding.ftue.chooseLanguage', 'Choose your language')}
        </m.p>
      </m.div>

      {/* Language cards — 2-col on mobile, 4-col on desktop so all flags sit on one row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4 w-full px-1">
        {SUPPORTED_GAME_LANGUAGES.map((lang, i) => {
          const config = LANGUAGE_CONFIG[lang];
          const isSelected = selected === lang;

          return (
            <m.button
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
                  ? 'bg-neo-lime/15 border-neo-lime text-neo-white shadow-hard-sm'
                  : 'bg-neo-navy-light border-neo-cream/15 text-neo-white hover:border-neo-cream/30'
              )}
            >
              {/* Selection check badge */}
              {isSelected && (
                <m.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute top-1.5 inset-e-1.5 w-5 h-5 bg-neo-lime border-2 border-neo-black rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-neo-black" strokeWidth={3} />
                </m.div>
              )}

              <span className="text-3xl leading-none" role="img" aria-label={config.name}>
                {config.flag}
              </span>
              <span className={cn(
                'text-sm font-bold',
                isSelected && 'text-neo-white'
              )}>
                {config.nativeName}
              </span>
            </m.button>
          );
        })}
      </div>

      {/* CTA button */}
      <m.button
        data-testid="language-continue"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 22 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={handleConfirm}
        className={cn(
          'mt-1 w-full lg:w-auto lg:px-12 py-3.5 lg:py-4 lg:self-center rounded-neo border-3 border-neo-black',
          'bg-neo-lime text-neo-navy font-neo-display font-black text-lg uppercase tracking-wide',
          'shadow-hard active:shadow-hard-pressed active:translate-y-[2px]',
          'transition-shadow flex items-center justify-center gap-2'
        )}
      >
        {t('onboarding.ftue.letsPlay', "Let's Play")}
        <ArrowRight className="w-5 h-5" />
      </m.button>

      {/* 🎯 "Play Now" skip — jump straight into a game, skip the rest of FTUE */}
      {onPlayNow && (
        <button
          data-testid="play-now-skip"
          onClick={onPlayNow}
          className="mt-3 text-neo-white/40 hover:text-neo-lime text-xs font-neo-body underline underline-offset-2 transition-colors"
        >
          {t('onboarding.ftue.playNow', 'Skip → Play Now')}
        </button>
      )}
    </div>
  );
};

export default LanguageSelect;
