'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, Trophy, Clock, Star, Flame,
  ChevronRight, ChevronLeft, Lightbulb,
  Check, Pointer
} from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useLanguage } from '../contexts/LanguageContext';
import type { LucideIcon } from 'lucide-react';
import MiniGrid, { GridPosition } from './onboarding/MiniGrid';

interface DemoConfig {
  letters: string[][];
  path: GridPosition[];
  word: string;
}

// Language-specific demo configurations (same as onboarding)
const demoConfigs: Record<string, DemoConfig> = {
  en: {
    letters: [['C', 'A', 'P'], ['D', 'T', 'O'], ['E', 'R', 'S']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'CAT',
  },
  es: {
    letters: [['S', 'O', 'P'], ['D', 'L', 'I'], ['E', 'R', 'N']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'SOL',
  },
  sv: {
    letters: [['S', 'O', 'P'], ['D', 'L', 'I'], ['E', 'R', 'N']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'SOL',
  },
  he: {
    letters: [['ש', 'מ', 'ל'], ['ד', 'ש', 'ו'], ['ת', 'ר', 'ס']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'שמש',
  },
  ja: {
    letters: [['C', 'A', 'P'], ['D', 'T', 'O'], ['E', 'R', 'S']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'CAT',
  },
};

/**
 * Step configuration
 */
interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  color: string;
}

/**
 * Step item for basics section
 */
interface StepItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

// NOTE: ComboVisualizer, XpExplainer, and AchievementTiers components
// have been moved to separate files in components/how-to-play/

/**
 * HowToPlay Props
 */
interface HowToPlayProps {
  onClose: () => void;
}

// Main HowToPlay Component
const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  const { t, dir, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [interactiveDemoCompleted, setInteractiveDemoCompleted] = useState(false);

  // Get the demo configuration for the current language, fallback to English
  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  // Simplified to 3 main steps for clearer onboarding
  const steps: Step[] = useMemo(() => [
    {
      id: 'basics',
      icon: Gamepad2,
      title: t('howToPlay.steps.basics.title'),
      color: 'bg-neo-cyan'
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title'),
      color: 'bg-neo-yellow'
    },
    {
      id: 'scoring',
      icon: Star,
      title: t('howToPlay.steps.scoring.title'),
      color: 'bg-neo-lime'
    },
  ], [t]);

  const nextStep = (): void => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = (): void => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const isRTL = dir === 'rtl';
  const activeStep = steps[currentStep] ?? steps[0];

  const renderStepContent = (): React.ReactNode => {
    const step = steps[currentStep];
    if (!step) return null;
    switch (step.id) {
      case 'basics':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.basics.description')}
            </p>

            <div className="space-y-2 sm:space-y-3">
              {([
                { icon: Users, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { icon: Clock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { icon: Trophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ] as StepItem[]).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-2 sm:gap-3 items-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                    <item.icon className="text-neo-black text-sm sm:text-base" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-neo-black text-sm sm:text-base">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-neo-black/70">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.grid.description')}
            </p>

            {/* Instruction banner - shows before demo is completed */}
            {!interactiveDemoCompleted && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neo-yellow border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-md text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Pointer className="text-lg text-neo-black animate-bounce" />
                  <span className="font-bold text-neo-black text-xs sm:text-sm">
                    {t('onboarding.welcome.demoInstruction') || 'Swipe to form:'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-neo-black">
                  {demoConfig.word}
                </div>
              </motion.div>
            )}

            {/* Interactive hands-on demo grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-neo-cyan/20 to-neo-pink/20 rounded-neo border-2 border-neo-black p-3 sm:p-4"
            >
              <MiniGrid
                size={3}
                letters={demoConfig.letters}
                demoWord={demoConfig.word}
                demoPath={demoConfig.path}
                onDemoComplete={() => setInteractiveDemoCompleted(true)}
                showHints={true}
              />
            </motion.div>

            {/* Success message when demo completed */}
            {interactiveDemoCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neo-lime border-3 border-neo-black rounded-neo p-2.5 sm:p-3 shadow-hard-md text-center"
              >
                <div className="text-base sm:text-lg font-black text-neo-black flex items-center justify-center gap-2">
                  <Check className="text-neo-black" />
                  {t('onboarding.welcome.demoSuccess') || "You've got it!"}
                </div>
              </motion.div>
            )}

            <div className="bg-neo-yellow/30 text-neo-black rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <Lightbulb className="text-neo-red flex-shrink-0" />
                {t('howToPlay.findWordsNote')}
              </p>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.scoring.description')}
            </p>

            {/* Simplified Scoring - Just show the formula and a few examples */}
            <div className="bg-neo-cream rounded-neo border-2 sm:border-3 border-neo-black p-3 sm:p-4 text-center shadow-hard">
              <p className="font-black text-neo-black text-base sm:text-lg mb-2">
                {t('howToPlay.scoringTable.formula')}
              </p>
              <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                {[
                  { letters: '3', points: 2 },
                  { letters: '5', points: 4 },
                  { letters: '7+', points: '6+' },
                ].map((item, index) => (
                  <div key={index} className="bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black px-3 py-1 sm:px-4 sm:py-2">
                    <span className="font-bold text-neo-black text-sm sm:text-base">
                      {item.letters} {t('howToPlay.letters')} = {item.points} {t('howToPlay.pts')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus features mention */}
            <div className="bg-neo-lime/30 text-neo-black rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <Flame className="text-neo-red flex-shrink-0" />
                {t('howToPlay.steps.combo.description') || 'Find words quickly for combo bonuses!'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-4"
      dir={dir}
    >
      {/* Progress Indicator - Scrollable on mobile */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between gap-1 sm:gap-2 mb-2 overflow-x-auto pb-1">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-neo border-2 border-neo-black flex items-center justify-center
                transition-all duration-200 shadow-hard-sm
                ${index === currentStep
                  ? `${step.color} scale-105 sm:scale-110 shadow-hard`
                  : index < currentStep
                    ? 'bg-neo-lime'
                    : 'bg-neo-cream'
                }
              `}
            >
              {index < currentStep ? (
                <Check className="text-neo-black text-xs sm:text-sm" />
              ) : (
                <step.icon className="text-neo-black text-xs sm:text-sm" />
              )}
            </button>
          ))}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} variant="accent" />
      </div>

      {/* Step Title */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${activeStep?.color ?? 'bg-neo-cyan'} rounded-neo border-2 sm:border-3 border-neo-black p-3 sm:p-4 mb-3 sm:mb-4 shadow-hard`}
      >
        <h3 className="text-base sm:text-xl font-black text-neo-black flex items-center gap-2">
          {activeStep && React.createElement(activeStep.icon, { className: 'text-sm sm:text-base' })}
          {activeStep?.title}
        </h3>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -50 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 50 : -50 }}
          transition={{ duration: 0.2 }}
          className="min-h-[200px] sm:min-h-[300px]"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Fixed at bottom on mobile */}
      <div className="flex justify-between items-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 border-neo-black/20 gap-2">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="bg-neo-cream text-sm sm:text-base px-2 sm:px-4"
        >
          <ChevronLeft className="me-1 sm:me-2 rtl:rotate-180" />
          <span className="hidden xs:inline">{t('common.back')}</span>
        </Button>

        <span className="text-xs sm:text-sm font-bold text-neo-black/75 flex-shrink-0">
          {currentStep + 1} / {steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-neo-lime text-sm sm:text-base px-2 sm:px-4"
          >
            <span className="hidden xs:inline">{t('common.understood')}</span>
            <span className="xs:hidden">OK</span>
            <Check className="ms-1 sm:ms-2" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextStep}
            className="bg-neo-yellow text-sm sm:text-base px-2 sm:px-4"
          >
            <span className="hidden xs:inline">{t('common.next') || 'Next'}</span>
            <span className="xs:hidden">{t('common.next') || 'Next'}</span>
            <ChevronRight className="ms-1 sm:ms-2 rtl:rotate-180" />
          </Button>
        )}
      </div>

      {/* Quick Tips - Only show on last step */}
      {currentStep === steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-neo-pink/20 rounded-neo border-2 border-neo-black p-3"
        >
          <h4 className="font-bold text-neo-black mb-2 flex items-center gap-2 text-sm">
            <Lightbulb className="text-neo-yellow" />
            {t('howToPlay.tipsTitle')}
          </h4>
          <ul className="space-y-1 text-xs text-neo-black">
            {[1, 2, 4].map((num) => (
              <li key={num} className="flex items-start gap-2">
                <Check className="text-neo-lime mt-0.5 flex-shrink-0 text-xs" />
                <span>{t(`howToPlay.tips.tip${num}`)}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HowToPlay;
