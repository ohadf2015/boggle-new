'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Zap, Trophy, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/shared/types/game';

const SUPPORTED_LOCALES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];

interface LobbyTutorialPanelProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TUTORIAL_STEPS = [
  { iconKey: 'gamepad', titleKey: 'tutorial.step1Title', descKey: 'tutorial.step1Desc' },
  { iconKey: 'zap', titleKey: 'tutorial.step2Title', descKey: 'tutorial.step2Desc' },
  { iconKey: 'trophy', titleKey: 'tutorial.step3Title', descKey: 'tutorial.step3Desc' },
] as const;

const STEP_ICONS = {
  gamepad: Gamepad2,
  zap: Zap,
  trophy: Trophy,
} as const;

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '\u{1F1FA}\u{1F1F8}',
  he: '\u{1F1EE}\u{1F1F1}',
  sv: '\u{1F1F8}\u{1F1EA}',
  ja: '\u{1F1EF}\u{1F1F5}',
  es: '\u{1F1EA}\u{1F1F8}',
};

export const LobbyTutorialPanel: React.FC<LobbyTutorialPanelProps> = ({ t }) => {
  const [step, setStep] = useState(0);
  const { language, setLanguage } = useLanguage();

  const currentStep = TUTORIAL_STEPS[step];
  const Icon = STEP_ICONS[currentStep.iconKey];

  const handlePrev = () => setStep(s => Math.max(0, s - 1));
  const handleNext = () => setStep(s => Math.min(TUTORIAL_STEPS.length - 1, s + 1));

  return (
    <div className="flex flex-col h-full p-4">
      {/* Tutorial Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 bg-neo-cyan/20 border-2 border-neo-cyan/40 rounded-neo flex items-center justify-center">
              <Icon className="w-6 h-6 text-neo-cyan" />
            </div>
            <h3 className="text-sm font-black uppercase text-neo-cream">
              {t(currentStep.titleKey)}
            </h3>
            <p className="text-xs text-neo-cream/70 max-w-[240px]">
              {t(currentStep.descKey)}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step Dots & Navigation */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
            aria-label={t('common.previous')}
          >
            <ChevronLeft className="w-4 h-4 text-neo-cream" />
          </button>
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-neo-cyan' : 'bg-neo-white/20'}`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            disabled={step === TUTORIAL_STEPS.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded bg-neo-white/10 disabled:opacity-30 transition-opacity"
            aria-label={t('common.next')}
          >
            <ChevronRight className="w-4 h-4 text-neo-cream" />
          </button>
        </div>
      </div>

      {/* UI Language Switcher (CrazyGames) */}
      <div className="flex-shrink-0 border-t border-neo-white/10 pt-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-3.5 h-3.5 text-neo-cream/60" />
          <span className="text-[10px] font-bold uppercase text-neo-cream/60">{t('tutorial.uiLanguage')}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              onClick={() => setLanguage(loc)}
              className={`px-2 py-1 text-xs font-bold rounded border-2 transition-all ${
                language === loc
                  ? 'bg-neo-cyan/20 border-neo-cyan text-neo-cyan'
                  : 'bg-neo-white/5 border-neo-white/20 text-neo-cream/60 hover:border-neo-cream/40'
              }`}
            >
              {LANGUAGE_FLAGS[loc] || ''} {t(`joinView.${loc === 'en' ? 'english' : loc === 'he' ? 'hebrew' : loc === 'sv' ? 'swedish' : loc === 'ja' ? 'japanese' : 'spanish'}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
