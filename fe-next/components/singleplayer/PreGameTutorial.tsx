'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pointer, Star, Zap, Play, Mouse } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Mascot, MascotWithEntrance } from '@/components/ui/Mascot';
import MiniGrid from '@/components/onboarding/MiniGrid';
import { demoConfigs } from '@/components/onboarding/demoConfigs';

interface PreGameTutorialProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 3;

/**
 * PreGameTutorial - 3-step mascot-guided tutorial shown before first game.
 * Step 0: Welcome — Mascot introduces the game
 * Step 1: Practice — Interactive MiniGrid demo
 * Step 2: Tips & Go — Scoring tips + "Let's Play!" CTA
 */
const PreGameTutorial: React.FC<PreGameTutorialProps> = ({ onComplete }) => {
  const { t, language } = useLanguage();
  const isDesktop = useIsDesktop();
  const [currentStep, setCurrentStep] = useState(0);

  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleDemoComplete = useCallback(() => {
    setCurrentStep(2);
  }, []);

  const tips = [
    { icon: isDesktop ? Mouse : Pointer, titleKey: isDesktop ? 'onboarding.quickTips.tip1TitleDesktop' : 'onboarding.quickTips.tip1Title', textKey: isDesktop ? 'onboarding.quickTips.tip1TextDesktop' : 'onboarding.quickTips.tip1Text' },
    { icon: Star, titleKey: 'onboarding.quickTips.tip2Title', textKey: 'onboarding.quickTips.tip2Text' },
    { icon: Zap, titleKey: 'onboarding.quickTips.tip3Title', textKey: 'onboarding.quickTips.tip3Text' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 z-10 text-neo-white/60 hover:text-neo-white text-sm font-bold px-3 py-1.5 rounded-neo border border-neo-white/20 hover:border-neo-white/40 transition-colors"
      >
        {t('preGameTutorial.skip')}
      </button>

      {/* Step content */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <MascotWithEntrance variant="happy" size="xl" priority />

              {/* Speech bubble */}
              <div className="relative bg-neo-cream border-3 border-neo-black rounded-neo p-4 shadow-hard max-w-sm">
                {/* Bubble tail */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-neo-black" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-neo-cream" />

                <h2 className="text-xl font-black text-neo-black">
                  {t('preGameTutorial.welcome.title')}
                </h2>
                <p className="text-sm text-neo-black/70 mt-1">
                  {t('preGameTutorial.welcome.subtitle')}
                </p>
              </div>

              <button
                onClick={handleNext}
                className="bg-neo-yellow border-3 border-neo-black rounded-neo px-6 py-3 font-black text-neo-black shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-y-1 transition-all"
              >
                {t('preGameTutorial.next')}
              </button>
            </motion.div>
          )}

          {/* Step 1: Practice */}
          {currentStep === 1 && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-4 w-full"
            >
              <div className="flex items-center gap-3">
                <Mascot variant="gaming" size="md" />
                <div className="relative bg-neo-cream border-3 border-neo-black rounded-neo p-3 shadow-hard-sm text-left">
                  <p className="font-bold text-sm text-neo-black">
                    {t('preGameTutorial.practice.instruction')}
                  </p>
                  <p className="text-lg font-black text-neo-black mt-0.5">
                    {demoConfig.word}
                  </p>
                </div>
              </div>

              <MiniGrid
                size={3}
                letters={demoConfig.letters}
                demoWord={demoConfig.word}
                demoPath={demoConfig.path}
                onDemoComplete={handleDemoComplete}
                showHints
              />

              <button
                onClick={handleNext}
                className="text-neo-white/60 hover:text-neo-white text-sm font-bold transition-colors mt-2"
              >
                {t('preGameTutorial.next')}
              </button>
            </motion.div>
          )}

          {/* Step 2: Tips & Go */}
          {currentStep === 2 && (
            <motion.div
              key="tips"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-4 w-full"
            >
              <Mascot variant="celebration" size="lg" />

              <div className="relative bg-neo-cream border-3 border-neo-black rounded-neo p-4 shadow-hard max-w-sm">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[12px] border-b-neo-black" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-neo-cream" />

                <h2 className="text-lg font-black text-neo-black">
                  {t('preGameTutorial.tips.title')}
                </h2>
                <p className="text-xs text-neo-black/60 mt-0.5">
                  {t('preGameTutorial.tips.subtitle')}
                </p>
              </div>

              {/* Tip cards */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {tips.map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <motion.div
                      key={tip.titleKey}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cream"
                    >
                      <div className="w-8 h-8 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="font-black text-[10px] text-neo-black leading-tight">
                        {t(tip.titleKey)}
                      </div>
                      <div className="text-[9px] text-neo-black/60 leading-snug">
                        {t(tip.textKey)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Let's Play CTA */}
              <motion.button
                onClick={onComplete}
                className="bg-neo-lime border-3 border-neo-black rounded-neo px-8 py-3.5 font-black text-lg text-neo-black shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-y-1 transition-all flex items-center gap-2"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
                {t('preGameTutorial.letsPlay')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mt-6 mb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            data-testid={`progress-dot-${i}`}
            className={`w-2.5 h-2.5 rounded-full border-2 border-neo-black transition-colors ${
              i === currentStep ? 'bg-neo-yellow' : 'bg-neo-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PreGameTutorial;
